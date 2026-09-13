#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const cli = path.join(root, "src/receipt/acceptance.js");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const fixtureRoots = new Set();
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const baseApp = "exports.total = items => items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n";
const feature = "exports.discount = cents => Math.round(cents * 0.9);\n";
const probe = `const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = require('./app.cjs');
const id = process.argv[2];
fs.appendFileSync(process.env.FORGE_HARNESS_EVENTS, id + '\\n');
if (id === 'total') {
  assert.equal(app.total([{price: 500, quantity: 2}, {price: 250, quantity: 1}]), 1250);
  assert.equal(app.total([]), 0);
} else if (id === 'discount') {
  assert.equal(app.discount(1000), 900);
} else { throw new Error('unknown probe'); }
console.log(id + ': observed expected numeric results');
`;

function exec(command, args, cwd, extraEnv = {}) {
  // Trust only repositories created by this run, including on ownership-less volumes.
  // Config is inherited by the receipt subprocess, never written to global Git config.
  const environment = { ...process.env, ...extraEnv };
  let count = Number(environment.GIT_CONFIG_COUNT || 0);
  for (const repo of fixtureRoots) {
    environment[`GIT_CONFIG_KEY_${count}`] = "safe.directory";
    environment[`GIT_CONFIG_VALUE_${count}`] = repo.split(path.sep).join("/");
    count += 1;
  }
  environment.GIT_CONFIG_COUNT = String(count);
  return spawnSync(command, args, {
    cwd, env: environment, encoding: "utf8",
    timeout: 60000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
}

function git(repo, ...args) {
  const result = exec("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", "-C", repo, ...args], repo);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function configure(repo) {
  git(repo, "config", "user.name", "Acceptance harness");
  git(repo, "config", "user.email", "harness@example.invalid");
  git(repo, "config", "core.autocrlf", "false");
  const hooks = path.join(repo, ".git", "empty-hooks");
  fs.mkdirSync(hooks);
  git(repo, "config", "core.hooksPath", hooks);
}

function commit(repo, message) {
  git(repo, "add", ".");
  git(repo, "commit", "--quiet", "-m", message);
}

function contractFor(repo, ids) {
  const binding = (file) => ({ path: file, sha256: hash(fs.readFileSync(path.join(repo, file))) });
  return {
    schemaVersion: "1.0.0", repository: { revision: git(repo, "rev-parse", "HEAD") },
    handoff: binding("handoff.md"), files: [binding("app.cjs"), binding("probe.cjs")],
    checks: ids.map((id) => ({ id, command: process.execPath, args: ["probe.cjs", id], timeoutMs: 10000 })),
    claims: ids.map((id) => ({ id, text: id === "total" ? "Existing quantity-aware totals still pass the baseline checks." : "The new ten-percent discount passes its check.", checks: [id] })),
  };
}

// Expected results are declared independently of the receipt's aggregation code.
const cases = [
  { id: "baseline", expected: "verified", binding: "verified", selected: ["total"], events: ["total"], claims: ["verified"] },
  { id: "inspection", expected: "unchecked", binding: "verified", selected: [], events: [], claims: ["unchecked"] },
  { id: "stale-revision", expected: "disputed", binding: "disputed", selected: ["total"], events: [], claims: ["disputed"] },
  { id: "tampered-handoff", expected: "disputed", binding: "disputed", selected: ["total"], events: [], claims: ["disputed"] },
  { id: "missing-file", expected: "disputed", binding: "disputed", selected: ["total"], events: [], claims: ["disputed"] },
  { id: "safe-extension", expected: "verified", binding: "verified", selected: ["total", "discount"], events: ["total", "discount"], claims: ["verified", "verified"], extended: true },
  { id: "preservation-regression", expected: "disputed", binding: "verified", selected: ["total", "discount"], events: ["total", "discount"], claims: ["disputed", "verified"], extended: true },
  { id: "partial-selection", expected: "unchecked", binding: "verified", selected: ["discount"], events: ["discount"], claims: ["unchecked", "verified"], extended: true },
];

function runCase(runRoot, origin, scenario) {
  const directory = path.join(runRoot, scenario.id);
  fs.mkdirSync(directory);
  const repo = path.join(directory, "receiver");
  fixtureRoots.add(repo);
  git(runRoot, "clone", "--quiet", "--no-local", origin, repo);
  configure(repo);
  if (scenario.extended) {
    const app = scenario.id === "preservation-regression"
      ? "exports.total = items => items.reduce((sum, item) => sum + item.price, 0);\n" + feature
      : baseApp + feature;
    fs.writeFileSync(path.join(repo, "app.cjs"), app);
    commit(repo, "Add discount behavior");
  }
  const contract = contractFor(repo, scenario.extended ? ["total", "discount"] : ["total"]);
  if (scenario.id === "stale-revision") {
    fs.writeFileSync(path.join(repo, "change.txt"), "New revision after contract creation.\n");
    commit(repo, "Advance beyond the pinned handoff");
  } else if (scenario.id === "tampered-handoff") {
    fs.appendFileSync(path.join(repo, "handoff.md"), "Unexpected additional instructions.\n");
  } else if (scenario.id === "missing-file") {
    fs.unlinkSync(path.join(repo, "app.cjs"));
  }
  const contractPath = path.join(directory, "contract.json");
  writeJson(contractPath, contract);
  const eventsPath = path.join(directory, "execution-events.txt");
  const args = [cli, "--repo", repo, "--contract", contractPath, "--out", path.join(directory, "receipt")];
  for (const id of scenario.selected) args.push("--run-check", id);
  const result = exec(process.execPath, args, directory, { FORGE_HARNESS_EVENTS: eventsPath });
  writeJson(path.join(directory, "invocation.json"), {
    command: process.execPath, args, exitCode: result.status,
    stdout: result.stdout, stderr: result.stderr, error: result.error?.message || null,
  });
  const receiptPath = path.join(directory, "receipt", "receipt.json");
  const receipt = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, "utf8")) : null;
  const events = fs.existsSync(eventsPath) ? fs.readFileSync(eventsPath, "utf8").trim().split("\n") : [];
  const assertions = [];
  const check = (name, actual, expected) => {
    try { assert.deepEqual(actual, expected); assertions.push({ name, passed: true }); }
    catch { assertions.push({ name, passed: false, actual, expected }); }
  };
  check("CLI exit matches evidence status", result.status, scenario.expected === "verified" ? 0 : 1);
  check("receipt status", receipt?.status, scenario.expected);
  check("binding status", receipt?.repository.binding, scenario.binding);
  check("per-claim results", receipt?.claims.map((claim) => claim.status), scenario.claims);
  check("independent command execution events", events, scenario.events);
  check("human acceptance is never automatic", receipt?.acceptance, "pending-user-review");
  check("contract bytes bound correctly", receipt?.contractSha256, hash(fs.readFileSync(contractPath)));
  check("handoff bytes were measured", receipt?.repository.before.files[0].actualSha256, hash(fs.readFileSync(path.join(repo, "handoff.md"))));
  check("readable receipt exists", fs.existsSync(path.join(directory, "receipt", "receipt.md")), true);
  for (const entry of receipt?.checks || []) {
    if (scenario.events.includes(entry.id)) {
      check(`${entry.id} has execution timestamp`, typeof entry.startedAt, "string");
      check(`${entry.id} records a numeric exit`, typeof entry.exitCode, "number");
    } else check(`${entry.id} was not started`, entry.startedAt, undefined);
  }
  return {
    id: scenario.id, passed: assertions.every((item) => item.passed), expected: scenario.expected,
    actual: receipt?.status ?? "no-receipt", assertions,
    receipt: `${scenario.id}/receipt/receipt.json`, report: `${scenario.id}/receipt/receipt.md`,
    revision: contract.repository.revision, probeSha256: contract.files.find((file) => file.path === "probe.cjs").sha256,
    baselineStatus: receipt?.claims.find((claim) => claim.id === "total")?.status,
  };
}

function run(out) {
  const runRoot = out ? path.resolve(out) : path.join(os.tmpdir(), `forge-acceptance-${crypto.randomUUID()}`);
  const parent = fs.realpathSync(path.dirname(runRoot));
  const relative = path.relative(fs.realpathSync(root), path.join(parent, path.basename(runRoot)));
  assert.ok(relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative), "output must be outside Forge checkout");
  fs.mkdirSync(runRoot); // New directory only; retain all evidence, no cleanup.
  const startedAt = new Date().toISOString();
  const origin = path.join(runRoot, "sender");
  fs.mkdirSync(origin);
  fixtureRoots.add(origin);
  git(origin, "init", "--quiet");
  configure(origin);
  fs.writeFileSync(path.join(origin, "app.cjs"), baseApp);
  fs.writeFileSync(path.join(origin, "probe.cjs"), probe);
  fs.writeFileSync(path.join(origin, "handoff.md"), "# Fixture handoff\n\nAdd a ten-percent discount while preserving quantity-aware totals.\nThis is a synthetic arithmetic fixture, not a production application.\n");
  commit(origin, "Baseline handoff fixture");
  const results = [];
  for (const scenario of cases) {
    try { results.push(runCase(runRoot, origin, scenario)); }
    catch (error) { results.push({ id: scenario.id, passed: false, expected: scenario.expected, actual: "harness-error", error: error.stack }); }
    const last = results.at(-1);
    console.log(`${last.passed ? "PASS" : "FAIL"} ${last.id}: expected ${last.expected}, observed ${last.actual}`);
  }
  const baseline = results.find((item) => item.id === "baseline");
  const preservation = ["safe-extension", "preservation-regression", "partial-selection"].map((id) => {
    const current = results.find((item) => item.id === id);
    const comparable = baseline.passed && baseline.probeSha256 === current.probeSha256;
    const observed = !comparable ? "not-comparable" : current.baselineStatus === "verified" ? "preserved" : current.baselineStatus === "disputed" ? "regressed" : "unchecked";
    const expected = { "safe-extension": "preserved", "preservation-regression": "regressed", "partial-selection": "unchecked" }[id];
    return { id, baselineRevision: baseline.revision, candidateRevision: current.revision, sameProbe: comparable, observed, expected, passed: observed === expected };
  });
  const report = {
    schemaVersion: "1.0.0", startedAt, finishedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, git: git(origin, "--version") },
    sources: { runnerSha256: hash(fs.readFileSync(cli)), harnessSha256: hash(fs.readFileSync(__filename)) },
    results, preservation,
    passed: results.every((item) => item.passed) && preservation.every((item) => item.passed),
  };
  writeJson(path.join(runRoot, "report.json"), report);
  const lines = ["# Acceptance Receipt Harness", "", `Result: **${report.passed ? "PASS" : "FAIL"}**`, "",
    "A disputed receipt is an expected success when the scenario injects a defect.", "",
    "| Scenario | Expected receipt | Actual receipt | Harness | Evidence |", "|---|---|---|---|---|",
    ...results.map((item) => `| ${item.id} | ${item.expected} | ${item.actual} | ${item.passed ? "PASS" : "FAIL"} | ${item.report ? `[receipt](${item.report})` : "setup failed"} |`),
    "", "## Preservation experiment", "", "The same probe bytes run against separate baseline and candidate commits.", "",
    "| Candidate | Expected | Observed | Harness |", "|---|---|---|---|",
    ...preservation.map((item) => `| ${item.id} | ${item.expected} | ${item.observed} | ${item.passed ? "PASS" : "FAIL"} |`), "",
    "This tests the receipt CLI against synthetic local fixtures. It does not test an AI agent, real application coverage, handoff conformance, or a production preservation-comparison feature.", "",
    "report.json contains assertions, source hashes, revisions, and errors. Each scenario retains its fresh receiver clone, contract, invocation, execution event log when checks ran, and receipts.", "",
  ];
  fs.writeFileSync(path.join(runRoot, "report.md"), lines.join("\n"));
  console.log(`Report: ${path.join(runRoot, "report.md")}`);
  return report.passed ? 0 : 1;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    assert.ok(args.length === 0 || (args.length === 2 && args[0] === "--out" && args[1]), "usage: node harness/acceptance/run.js [--out NEW_DIRECTORY]");
    process.exitCode = run(args[1]);
  } catch (error) { console.error(error.stack); process.exitCode = 2; }
}

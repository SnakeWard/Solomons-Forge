#!/usr/bin/env node
// Runs Forge's CI checks through the Key verifier, as spec/verification-interface.md
// specifies. Subcommands, in CI order:
//   install            download the pinned Key release and check its SHA-256
//   gate GATE_ID       run one Forge check and record its decision with Key's adapter
//   verify             write run.json, lint the contract, and verify the run with Key
//   drill              confirm that a removed gate decision and an altered release
//                      hash are both rejected
// Environment: KEY_HOME (Key install directory), KEY_RUN (run directory),
// PYTHON (defaults to "python").

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const KEY_RELEASE = {
  version: "v0.10.1",
  url: "https://github.com/SnakeWard/solomons-key/releases/download/v0.10.1/solomons-key-v0.10.1.tar.gz",
  sha256: "cb58ee272fa37816c4191a75539a2dad1752996a7be24baec3d1bc4c8d3f3ede",
  directory: "solomons-key-v0.10.1",
};
const CONTRACT = path.join(rootDir, "key", "key-contract.yaml");
const ROUTE = "ci";
const CI_GATES = ["term_lint_gate", "spec_structure_gate", "handoff_conformance_gate", "unit_tests_gate", "acceptance_harness_gate"];
const TARBALL = "release.tar.gz";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function fail(message) {
  throw new Error(message);
}

function verifyDigest(bytes, expected) {
  const actual = sha256(bytes);
  if (actual !== expected) fail(`Key release SHA-256 mismatch: expected ${expected}, got ${actual}`);
  return actual;
}

// The documents CI validates are the single source of truth for handoff_conformance_gate.
function handoffDocuments(workflowText) {
  const documents = [...workflowText.matchAll(/npm run validate:handoff (\S+)/g)].map((match) => match[1]);
  if (documents.length === 0) fail("no validate:handoff steps found in the CI workflow");
  return [...new Set(documents)];
}

function allowlistPath(platform = process.platform, arch = process.arch) {
  return path.join(rootDir, "key", `trusted-programs-${platform}-${arch}.sha256`);
}

function parseAllowlist(text) {
  const entries = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [digest, name] = line.split(/\s{2}/);
    if (!/^[a-f0-9]{64}$/.test(digest || "") || !name) fail(`malformed allowlist line: ${line}`);
    entries[name.trim()] = digest;
  }
  return entries;
}

// A run passes only when every gate on the route recorded a passing decision.
function runResult(decisions, gates = CI_GATES) {
  return gates.every((gate) => decisions[gate] === "pass") ? "pass" : "fail";
}

function env(name) {
  const value = process.env[name];
  if (!value) fail(`${name} must be set`);
  return path.resolve(value);
}

function keyDir() {
  return path.join(env("KEY_HOME"), KEY_RELEASE.directory);
}

// Fixed on first use for the whole run directory: every decision must carry the same run ID.
function runId() {
  const runDir = env("KEY_RUN");
  const file = path.join(runDir, "run-id.txt");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const id = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}_${process.env.GITHUB_RUN_ATTEMPT || "1"}` : String(Date.now());
  const value = `RUN_forge_ci_${id}_${process.platform}`;
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(file, `${value}\n`);
  return value;
}

function run(command, args, options = {}) {
  const shell = process.platform === "win32" && command === "npm";
  const result = spawnSync(command, args, { cwd: rootDir, stdio: "inherit", shell, windowsHide: true, ...options });
  if (result.error) fail(`${command} could not run: ${result.error.message}`);
  if (result.status === null) fail(`${command} ended by signal ${result.signal}`);
  return result.status;
}

function python(args, options = {}) {
  return spawnSync(process.env.PYTHON || "python", args, { encoding: "utf8", windowsHide: true, ...options });
}

function whichNode() {
  const names = process.platform === "win32" ? ["node.exe"] : ["node"];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

// Key's adapter hashes the node it resolves on PATH, so checks must run with that node,
// and it must be the one the allowlist pins.
function checkNode() {
  const listPath = allowlistPath();
  if (!fs.existsSync(listPath)) fail(`no trusted-programs allowlist for ${process.platform}-${process.arch}: ${listPath}`);
  const pinned = parseAllowlist(fs.readFileSync(listPath, "utf8")).node;
  if (!pinned) fail(`${listPath} does not pin node`);
  const onPath = whichNode();
  if (!onPath) fail("node is not on PATH");
  if (fs.realpathSync.native(onPath) !== fs.realpathSync.native(process.execPath)) {
    fail(`node on PATH (${onPath}) is not the node running this script (${process.execPath})`);
  }
  const actual = sha256(fs.readFileSync(process.execPath));
  if (actual !== pinned) fail(`node at ${process.execPath} hashes to ${actual}; ${path.basename(listPath)} pins ${pinned}`);
}

async function install() {
  const home = env("KEY_HOME");
  fs.mkdirSync(home, { recursive: true });
  const response = await fetch(KEY_RELEASE.url);
  if (!response.ok) fail(`download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  verifyDigest(bytes, KEY_RELEASE.sha256);
  const tarball = path.join(home, TARBALL);
  fs.writeFileSync(tarball, bytes);
  if (run("tar", ["-xzf", TARBALL], { cwd: home }) !== 0) fail("could not extract the Key release");
  if (!fs.existsSync(path.join(keyDir(), "sk_verify.py"))) fail("extracted release has no sk_verify.py");
  console.log(`Key ${KEY_RELEASE.version} installed at ${keyDir()} (SHA-256 verified)`);
}

function checkExitCode(gate, runDir) {
  switch (gate) {
    case "term_lint_gate":
      return run("npm", ["run", "-s", "lint:terms"]);
    case "spec_structure_gate":
      return run("npm", ["run", "-s", "lint:spec"]);
    case "handoff_conformance_gate": {
      const workflow = fs.readFileSync(path.join(rootDir, ".github", "workflows", "ci.yml"), "utf8");
      let code = 0;
      for (const document of handoffDocuments(workflow)) {
        const status = run("npm", ["run", "-s", "validate:handoff", document]);
        if (code === 0 && status !== 0) code = status;
      }
      return code;
    }
    case "acceptance_harness_gate":
      return run("npm", ["run", "-s", "test:acceptance", "--", "--out", path.join(runDir, "acceptance-results")]);
    default:
      return fail(`unknown exit-code gate: ${gate}`);
  }
}

function gate(id) {
  if (!CI_GATES.includes(id)) fail(`unknown gate ${id}; expected one of ${CI_GATES.join(", ")}`);
  checkNode();
  const runDir = env("KEY_RUN");
  const artifacts = path.join(runDir, "artifacts");
  fs.mkdirSync(artifacts, { recursive: true });
  let adapterArgs;
  if (id === "unit_tests_gate") {
    if (run("npm", ["run", "-s", "build:vscode"]) !== 0) fail("extension build failed before unit tests");
    // Key v0.10.1's JUnit adapter records failing Node test runs as passing (spec 3.1),
    // so the decision comes from the exit code. The JUnit report is kept as supporting output.
    const report = path.join(runDir, "junit.xml");
    const code = run(process.execPath, ["--test", "--test-concurrency=1", "--test-reporter=spec", "--test-reporter-destination=stdout",
      "--test-reporter=junit", `--test-reporter-destination=${report}`]);
    adapterArgs = ["exit-code", String(code)];
  } else {
    adapterArgs = ["exit-code", String(checkExitCode(id, runDir))];
  }
  const result = python([path.join(keyDir(), "sk_adapt.py"), ...adapterArgs, "--gate", id, "--program", "node",
    "--run-id", runId(), "--route", ROUTE, "--out", artifacts], { cwd: rootDir });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  // The adapter exits 1 for a recorded failing decision; the run continues so every gate is recorded.
  if (result.status !== 0 && result.status !== 1) fail(`Key adapter failed for ${id} (exit ${result.status})`);
  const decisionFile = path.join(artifacts, `gate_${id}.json`);
  if (!fs.existsSync(decisionFile)) fail(`Key adapter recorded no decision for ${id}`);
  const decision = JSON.parse(fs.readFileSync(decisionFile, "utf8")).body.decision;
  console.log(`${id}: ${decision} (recorded)`);
}

function readDecisions(runDir) {
  const decisions = {};
  for (const id of CI_GATES) {
    const file = path.join(runDir, "artifacts", `gate_${id}.json`);
    if (fs.existsSync(file)) decisions[id] = JSON.parse(fs.readFileSync(file, "utf8")).body.decision;
  }
  return decisions;
}

function keyVerify(runDir) {
  return python([path.join(keyDir(), "sk_verify.py"), runDir, "--key", CONTRACT, "--trusted", allowlistPath(),
    "--schemas", path.join(keyDir(), "schemas", "artifacts")], { cwd: keyDir() });
}

function verify() {
  const runDir = env("KEY_RUN");
  const listPath = allowlistPath();
  if (!fs.existsSync(listPath)) fail(`no trusted-programs allowlist for ${process.platform}-${process.arch}`);

  const lint = python([path.join(keyDir(), "sk_lint.py"), CONTRACT], { cwd: keyDir() });
  process.stdout.write(lint.stdout || "");
  if (lint.status !== 0) fail(`Key contract lint failed (exit ${lint.status})`);

  const decisions = readDecisions(runDir);
  const result = runResult(decisions);
  const manifest = {
    run_id: runId(), key_file: CONTRACT, key_sha256: sha256(fs.readFileSync(CONTRACT)),
    task_frame_id: "forge_ci", selected_route_id: ROUTE, actor: "ci", result,
    trusted_programs_file: listPath,
  };
  fs.writeFileSync(path.join(runDir, "run.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const verified = keyVerify(runDir);
  const output = `${verified.stdout || ""}${verified.stderr || ""}`;
  process.stdout.write(output);
  const problems = [];
  if (verified.status !== 0) problems.push(`Key run verification failed (exit ${verified.status})`);
  // Key only warns when no allowlist is read; that would remove the root of trust, so it fails here.
  if (/RUN17/.test(output)) problems.push("RUN17 reported: the trusted-program check did not pass cleanly");
  if (result !== "pass") problems.push(`recorded decisions: ${JSON.stringify(decisions)}`);
  if (problems.length > 0) fail(problems.join("; "));
  console.log("Key verified the Forge CI run.");
}

function drill() {
  const runDir = env("KEY_RUN");
  const problems = [];

  const bypass = fs.mkdtempSync(path.join(os.tmpdir(), "forge-key-drill-"));
  try {
    fs.cpSync(runDir, bypass, { recursive: true });
    fs.rmSync(path.join(bypass, "artifacts", "gate_term_lint_gate.json"));
    const result = keyVerify(bypass);
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    if (result.status === 0) problems.push("Key accepted a run with a removed gate decision");
    if (!/RUN06/.test(output) || !/term_lint_gate/.test(output)) problems.push("Key did not name the missing term_lint_gate (RUN06)");
  } finally {
    fs.rmSync(bypass, { recursive: true, force: true });
  }

  const bytes = fs.readFileSync(path.join(env("KEY_HOME"), TARBALL));
  const altered = `${KEY_RELEASE.sha256.slice(0, -1)}${KEY_RELEASE.sha256.endsWith("0") ? "1" : "0"}`;
  let rejected = false;
  try {
    verifyDigest(bytes, altered);
  } catch {
    rejected = true;
  }
  if (!rejected) problems.push("an altered release SHA-256 was accepted");

  if (problems.length > 0) fail(problems.join("; "));
  console.log("Drill passed: the removed gate was reported as RUN06, and an altered release hash was rejected.");
}

async function main(argv) {
  const [command, argument] = argv;
  if (command === "install") return install();
  if (command === "gate") return gate(argument);
  if (command === "verify") return verify();
  if (command === "drill") return drill();
  return fail("usage: node scripts/key-verify.js install | gate GATE_ID | verify | drill");
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`key-verify: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { KEY_RELEASE, CI_GATES, verifyDigest, handoffDocuments, allowlistPath, parseAllowlist, runResult };

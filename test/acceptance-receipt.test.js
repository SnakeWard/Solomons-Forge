const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { createReceipt, validateContract, sha256, markdown } = require("../src/receipt/acceptance");

const cli = path.resolve(__dirname, "../src/receipt/acceptance.js");
const { bindContract } = require("../src/contract/bind");
const bindCli = path.resolve(__dirname, "../src/contract/bind.js");
const { runWorker } = require("../extensions/vscode/src/controller");

test("extension worker binds and writes receipts with the shared engine", async (t) => {
  const { dir, repo, contract } = fixture(t);
  const bound = await runWorker({ operation: "bind", repo, contractText: JSON.stringify(contract), output: path.join(dir, "bound.json") });
  const contractText = fs.readFileSync(bound.file, "utf8");
  assert.deepEqual(JSON.parse(contractText), contract);
  const inspected = await runWorker({ operation: "inspect", repo, contractText, output: path.join(dir, "inspection") });
  assert.equal(inspected.status, "unchecked");
  const checked = await runWorker({ operation: "run", repo, contractText, output: path.join(dir, "checked"), runChecks: ["baseline"] });
  assert.equal(checked.status, "verified");
  assert.equal(checked.acceptance, "pending-user-review");
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "checked", "receipt.json"))).status, "verified");
  await assert.rejects(runWorker({ operation: "run", repo, contractText, output: path.join(dir, "checked"), runChecks: ["baseline"] }), /EEXIST/);
  await assert.rejects(runWorker({ operation: "inspect", repo, contractText, output: path.join(repo, "receipt") }), /outside/);
  await assert.rejects(runWorker({ operation: "inspect", repo, contractText, output: path.join(dir, "invalid"), runChecks: ["baseline"] }), /cannot execute/);
});

test("automatic binding fills drafts and round-trips through receiver checks", (t) => {
  const { repo, contract } = fixture(t);
  const draft = structuredClone(contract);
  delete draft.repository;
  for (const file of [draft.handoff, ...draft.files]) delete file.sha256;
  const contractBytes = Buffer.from(JSON.stringify(draft));
  const bound = bindContract({ repo, contractBytes });
  assert.deepEqual(bound, contract);
  assert.deepEqual(JSON.parse(contractBytes), draft);
  const receipt = createReceipt({ repo, contractBytes: Buffer.from(JSON.stringify(bound)), runChecks: ["baseline"] });
  assert.equal(receipt.status, "verified");
  assert.equal(receipt.acceptance, "pending-user-review");
});

test("binding refreshes stale values without executing declared commands", (t) => {
  const { repo, contract } = fixture(t);
  const expectedRevision = contract.repository.revision;
  contract.repository.revision = "0".repeat(40);
  contract.handoff.sha256 = "0".repeat(64);
  contract.checks[0].args = ["-e", "require('node:fs').writeFileSync('executed', 'bad')"];
  const bound = bindContract({ repo, contractBytes: Buffer.from(JSON.stringify(contract)) });
  assert.equal(bound.repository.revision, expectedRevision);
  assert.equal(bound.handoff.sha256, sha256(fs.readFileSync(path.join(repo, "handoff.md"))));
  assert.deepEqual(bound.checks, contract.checks);
  assert.deepEqual(bound.claims, contract.claims);
  assert.equal(fs.existsSync(path.join(repo, "executed")), false);
});

test("binding rejects dirty trees, missing files and unsafe or invalid drafts", (t) => {
  const { repo, contract } = fixture(t);
  const bind = () => bindContract({ repo, contractBytes: Buffer.from(JSON.stringify(contract)) });
  contract.files[0].path = "../outside";
  assert.throws(bind, /repository-relative/);
  contract.files[0].path = "missing.txt";
  assert.throws(bind, /missing.txt/);
  contract.files[0].path = "app.txt";
  contract.claims[0].checks = ["unknown"];
  assert.throws(bind, /declared check ids/);
  contract.claims[0].checks = ["baseline"];
  fs.writeFileSync(path.join(repo, "new.txt"), "untracked");
  assert.throws(bind, /clean/);
  fs.unlinkSync(path.join(repo, "new.txt"));
  fs.writeFileSync(path.join(repo, "app.txt"), "modified");
  assert.throws(bind, /clean/);
});

test("binding CLI writes a new external file and refuses overwrite or internal output", (t) => {
  const { dir, repo, contract } = fixture(t);
  const draft = path.join(dir, "draft.json");
  const output = path.join(dir, "bound.json");
  fs.writeFileSync(draft, JSON.stringify(contract));
  const run = (out, extra = []) => spawnSync(process.execPath,
    [bindCli, "--repo", repo, "--contract", draft, "--out", out, ...extra],
    { encoding: "utf8", windowsHide: true });
  const result = run(output);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(output)), contract);
  const bytes = fs.readFileSync(output, "utf8");
  assert.equal(run(output).status, 2);
  assert.equal(fs.readFileSync(output, "utf8"), bytes);
  assert.equal(run(path.join(repo, "bound.json")).status, 2);
  assert.equal(fs.existsSync(path.join(repo, "bound.json")), false);
  assert.equal(run(path.join(dir, "bad.json"), ["--run-check", "baseline"]).status, 2);
  assert.equal(fs.existsSync(path.join(dir, "bad.json")), false);
});
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-receipt-test-"));
  t.after(() => {
    assert.equal(path.dirname(dir), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("forge-receipt-test-"));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const repo = path.join(dir, "repo");
  fs.mkdirSync(repo);
  const git = (...args) => {
    const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "--quiet");
  git("config", "user.email", "receipt@example.invalid");
  git("config", "user.name", "Receipt test");
  git("config", "core.autocrlf", "false");
  fs.writeFileSync(path.join(repo, "handoff.md"), "A bounded test handoff.\n");
  fs.writeFileSync(path.join(repo, "app.txt"), "baseline\n");
  git("add", ".");
  git("-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "baseline");
  const binding = (name) => ({ path: name, sha256: sha256(fs.readFileSync(path.join(repo, name))) });
  const contract = {
    schemaVersion: "1.0.0", repository: { revision: git("rev-parse", "HEAD") },
    handoff: binding("handoff.md"), files: [binding("app.txt")],
    checks: [{ id: "baseline", command: process.execPath, args: ["-e", "const fs=require('node:fs'); if(fs.readFileSync('app.txt','utf8')!=='baseline\\n') process.exit(1); console.log('baseline matched');"], timeoutMs: 5000 }],
    claims: [{ id: "preserved", text: "The baseline file matches", checks: ["baseline"] }],
  };
  const run = (runChecks = []) => createReceipt({ repo, contractBytes: Buffer.from(JSON.stringify(contract)), runChecks });
  return { dir, repo, contract, run };
}

test("inspection records pinned inputs but does not execute checks or accept work", (t) => {
  const { run } = fixture(t);
  const receipt = run();
  assert.equal(receipt.repository.binding, "verified");
  assert.equal(receipt.checks[0].status, "unchecked");
  assert.equal(receipt.claims[0].status, "unchecked");
  assert.equal(receipt.status, "unchecked");
  assert.equal(receipt.acceptance, "pending-user-review");
});

test("selected check captures actual output, hashes and claim evidence", (t) => {
  const { contract, run } = fixture(t);
  const receipt = run(["baseline"]);
  assert.equal(receipt.status, "verified");
  assert.match(receipt.checks[0].stdout, /baseline matched/);
  assert.equal(receipt.checks[0].exitCode, 0);
  assert.deepEqual(receipt.claims[0].evidence, ["#/checks/0"]);
  assert.equal(receipt.contractSha256, sha256(Buffer.from(JSON.stringify(contract))));
  assert.match(markdown(receipt), /pending-user-review/);
});

test("stale revision blocks command execution and disputes claims", (t) => {
  const { contract, run } = fixture(t);
  contract.repository.revision = "0".repeat(40);
  const receipt = run(["baseline"]);
  assert.equal(receipt.status, "disputed");
  assert.equal(receipt.checks[0].startedAt, undefined);
  assert.equal(receipt.claims[0].status, "disputed");
});

test("wrong expected file digest blocks execution even on a clean tree", (t) => {
  const { contract, run } = fixture(t);
  contract.files[0].sha256 = "0".repeat(64);
  const receipt = run(["baseline"]);
  assert.equal(receipt.repository.before.worktreeStatus, "");
  assert.equal(receipt.repository.binding, "disputed");
  assert.equal(receipt.checks[0].startedAt, undefined);
});

test("modified handoff and missing bound files cannot inherit verification", (t) => {
  const { repo, run } = fixture(t);
  fs.writeFileSync(path.join(repo, "handoff.md"), "changed");
  fs.unlinkSync(path.join(repo, "app.txt"));
  const receipt = run(["baseline"]);
  assert.ok(receipt.repository.before.files.every((file) => file.status === "disputed"));
  assert.equal(receipt.checks[0].startedAt, undefined);
});

test("untracked files block execution", (t) => {
  const { repo, run } = fixture(t);
  fs.writeFileSync(path.join(repo, "new.txt"), "untracked");
  assert.equal(run(["baseline"]).repository.binding, "disputed");
});

test("a directory link cannot bind a file outside the repository", (t) => {
  const { dir, repo, contract, run } = fixture(t);
  const outside = path.join(dir, "outside");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "file.txt"), "external");
  fs.symlinkSync(outside, path.join(repo, "linked"), "junction");
  contract.files = [{ path: "linked/file.txt", sha256: sha256("external") }];
  const receipt = run();
  assert.equal(receipt.repository.before.files[1].status, "disputed");
  assert.match(receipt.repository.before.files[1].reason, /outside repository/);
});

test("failed, unavailable and timed-out checks never verify a claim", (t) => {
  const { contract, run } = fixture(t);
  contract.checks[0].args = ["-e", "process.exit(7)"];
  assert.equal(run(["baseline"]).checks[0].exitCode, 7);
  contract.checks[0].args = ["-e", "setInterval(()=>{},1000)"];
  contract.checks[0].timeoutMs = 100;
  let receipt = run(["baseline"]);
  assert.equal(receipt.status, "disputed");
  assert.match(receipt.checks[0].reason, /ETIMEDOUT/);
  contract.checks[0].command = "forge-command-does-not-exist-7e130";
  receipt = run(["baseline"]);
  assert.equal(receipt.claims[0].status, "disputed");
  assert.match(receipt.checks[0].reason, /ENOENT/);
});

test("output overflow fails closed", (t) => {
  const { contract, run } = fixture(t);
  contract.checks[0].args = ["-e", "process.stdout.write('x'.repeat(2*1024*1024))"];
  const receipt = run(["baseline"]);
  assert.equal(receipt.status, "disputed");
  assert.match(receipt.checks[0].reason, /ENOBUFS/);
});

test("input mutation during a successful command disputes it and blocks later checks", (t) => {
  const { contract, run } = fixture(t);
  contract.checks.push({ ...contract.checks[0], id: "later" });
  contract.checks[0].args = ["-e", "require('node:fs').writeFileSync('app.txt','changed')"];
  const receipt = run(["baseline", "later"]);
  assert.equal(receipt.checks[0].exitCode, 0);
  assert.equal(receipt.checks[0].status, "disputed");
  assert.equal(receipt.checks[1].startedAt, undefined);
  assert.equal(receipt.status, "disputed");
});

test("empty claim evidence stays unchecked and partial check selection stays unchecked", (t) => {
  const { contract, run } = fixture(t);
  contract.claims[0].checks = [];
  assert.equal(run(["baseline"]).claims[0].status, "unchecked");
  contract.checks.push({ ...contract.checks[0], id: "second" });
  contract.claims[0].checks = ["baseline", "second"];
  assert.equal(run(["baseline"]).claims[0].status, "unchecked");
});

test("malformed contracts and unknown execution selections are rejected", (t) => {
  const { contract, run } = fixture(t);
  assert.throws(() => run(["typo"]), /selected check ids/);
  for (const filePath of ["../outside", "/absolute", "C:/absolute", "a/../b", ".git/config"]) {
    const bad = structuredClone(contract);
    bad.handoff.path = filePath;
    assert.throws(() => validateContract(bad), /repository-relative/);
  }
  const bad = structuredClone(contract);
  bad.claims[0].checks = ["absent"];
  assert.throws(() => validateContract(bad), /declared check ids/);
  bad.claims[0].checks = ["baseline"];
  bad.checks.push(bad.checks[0]);
  assert.throws(() => validateContract(bad), /duplicate check/);
  assert.throws(() => validateContract({ ...contract, unexpected: true }), /unknown field/);
});

test("CLI writes both formats, refuses overwrite, and reports invalid usage", (t) => {
  const { dir, repo, contract } = fixture(t);
  const contractPath = path.join(dir, "contract.json");
  fs.writeFileSync(contractPath, JSON.stringify(contract));
  const output = path.join(dir, "receipt");
  const args = [cli, "--repo", repo, "--contract", contractPath, "--out", output, "--run-check", "baseline"];
  const invoke = (argv) => spawnSync(process.execPath, argv, { encoding: "utf8", windowsHide: true });
  let result = invoke(args);
  assert.equal(result.status, 0, result.stderr);
  const json = fs.readFileSync(path.join(output, "receipt.json"), "utf8");
  assert.equal(JSON.parse(json).status, "verified");
  assert.match(fs.readFileSync(path.join(output, "receipt.md"), "utf8"), /The baseline file matches/);
  result = invoke(args);
  assert.equal(result.status, 2);
  assert.equal(fs.readFileSync(path.join(output, "receipt.json"), "utf8"), json);
  assert.equal(invoke([cli]).status, 2);
  const inspectArgs = args.slice(0, -2);
  inspectArgs[inspectArgs.length - 1] = path.join(dir, "inspection");
  assert.equal(invoke(inspectArgs).status, 1);
  inspectArgs[inspectArgs.length - 1] = path.join(repo, "receipt");
  assert.equal(invoke(inspectArgs).status, 2);
});

test("Markdown neutralizes markup supplied by a claim", (t) => {
  const { contract, run } = fixture(t);
  contract.claims[0].text = "<script>bad</script>|extra\nrow";
  const output = markdown(run());
  assert.ok(!output.includes("<script>"));
  assert.ok(output.includes("&#124;"));
});

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createController } = require("../extensions/vscode/src/controller");
const { validateDraft } = require("../src/contract/bind");

function fixture(t, { trusted = true, selection = true, confirmed = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-editor-test-"));
  t.after(() => {
    assert.equal(path.dirname(dir), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("forge-editor-test-"));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const file = path.join(dir, "contract.json");
  const draft = {
    schemaVersion: "1.0.0", repository: { revision: "0".repeat(40) },
    handoff: { path: "handoff.md", sha256: "0".repeat(64) }, files: [],
    checks: [{ id: "baseline", command: "node", args: ["test.js"], timeoutMs: 1000 }],
    claims: [{ id: "baseline-passes", text: "Baseline test passes", checks: ["baseline"] }],
  };
  fs.writeFileSync(file, JSON.stringify(draft));
  const uri = (fsPath) => ({ scheme: "file", fsPath });
  const dialogs = [[uri(file)], [uri(dir)], [uri(dir)]];
  const calls = [];
  let prompts = 0;
  const vscode = {
    workspace: { isTrusted: trusted, textDocuments: [], openTextDocument: async (value) => value },
    Uri: { file: uri }, ProgressLocation: { Notification: 1 },
    window: {
      showOpenDialog: async () => dialogs.shift(),
      showQuickPick: async (items) => { assert.equal(items[0].picked, false); return selection ? [items[0]] : undefined; },
      showWarningMessage: async (_message, options) => { prompts++; assert.match(options.detail, /node/); return confirmed ? "Run selected checks" : undefined; },
      withProgress: async (_options, work) => work(),
      showTextDocument: async () => {}, showInformationMessage: () => {},
    },
  };
  const execute = async (data) => { calls.push(data); return { file: path.join(dir, "receipt.md"), status: "unchecked", acceptance: "pending-user-review" }; };
  return { vscode, calls, execute, file, draft, prompts: () => prompts };
}

test("editor blocks every repository operation in untrusted workspaces", async (t) => {
  const { vscode, calls, execute } = fixture(t, { trusted: false });
  const controller = createController(vscode, execute);
  for (const operation of ["bind", "inspect", "run"]) await assert.rejects(controller.operate(operation), /Trust this workspace/);
  assert.equal(calls.length, 0);
});

test("inspection never selects checks or prompts for execution", async (t) => {
  const f = fixture(t);
  await createController(f.vscode, f.execute).operate("inspect");
  assert.deepEqual(f.calls[0].runChecks, []);
  assert.equal(f.prompts(), 0);
});

test("check execution requires selection and confirmation", async (t) => {
  for (const options of [{ selection: false }, { confirmed: false }]) {
    const f = fixture(t, options);
    await createController(f.vscode, f.execute).operate("run");
    assert.equal(f.calls.length, 0);
  }
  const f = fixture(t);
  await createController(f.vscode, f.execute).operate("run");
  assert.deepEqual(f.calls[0].runChecks, ["baseline"]);
  assert.equal(f.prompts(), 1);
});

test("execution uses reviewed contract bytes even if disk changes during approval", async (t) => {
  const f = fixture(t);
  const reviewed = fs.readFileSync(f.file, "utf8");
  f.vscode.window.showWarningMessage = async () => {
    fs.writeFileSync(f.file, "changed after review");
    return "Run selected checks";
  };
  await createController(f.vscode, f.execute).operate("run");
  assert.equal(f.calls[0].contractText, reviewed);
});

test("unsaved contracts are rejected before execution", async (t) => {
  const f = fixture(t);
  f.vscode.workspace.textDocuments = [{ uri: { fsPath: f.file }, isDirty: true }];
  await assert.rejects(createController(f.vscode, f.execute).operate("bind"), /Save the contract/);
  assert.equal(f.calls.length, 0);
});

test("draft validation leaves the document unchanged", () => {
  const draft = { schemaVersion: "1.0.0", handoff: { path: "handoff.md" }, files: [], checks: [], claims: [{ id: "review", text: "Needs review", checks: [] }] };
  const before = structuredClone(draft);
  validateDraft(draft);
  assert.deepEqual(draft, before);
  assert.throws(() => validateDraft({ ...draft, extra: true }), /unknown field/);
});

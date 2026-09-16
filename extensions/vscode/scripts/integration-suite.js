"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const vscode = require("vscode");

async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(predicate(), "diagnostics did not reach expected state");
}

async function run() {
  const extension = vscode.extensions.getExtension("SnakeWard.forge-contracts");
  assert.ok(extension, "extension is registered");
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  for (const id of ["forge.bindContract", "forge.inspectReceipt", "forge.runChecks", "forge.validateContract"]) assert.ok(commands.includes(id), id);
  const draft = { schemaVersion: "1.0.0", handoff: { path: "handoff.md" }, files: [], checks: [], claims: [{ id: "review", text: "Review required", checks: [] }] };
  const invalid = { ...draft, claims: [] };
  const doc = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(invalid) });
  await vscode.window.showTextDocument(doc);
  await until(() => vscode.languages.getDiagnostics(doc.uri).some((item) => item.source === "Forge contract"));
  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), JSON.stringify(draft));
  assert.ok(await vscode.workspace.applyEdit(edit));
  await until(() => !vscode.languages.getDiagnostics(doc.uri).some((item) => item.source === "Forge contract"));

  // Exercise the bundled worker inside Electron's actual extension host.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-host-fixture-"));
  const repo = path.join(dir, "repo");
  fs.mkdirSync(repo);
  const git = (...args) => {
    const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", windowsHide: true, timeout: 10000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  };
  git("init", "--quiet");
  git("config", "user.name", "Forge extension test");
  git("config", "user.email", "forge@example.invalid");
  fs.writeFileSync(path.join(repo, "handoff.md"), "A test handoff.\n");
  git("add", ".");
  git("-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "fixture");
  const { runWorker } = require(path.join(extension.extensionPath, "src/controller"));
  draft.checks = [{ id: "baseline", command: "node", args: ["-e", "console.log('host check passed')"], timeoutMs: 5000 }];
  draft.claims = [{ id: "baseline-passes", text: "The selected test exits zero", checks: ["baseline"] }];
  const bound = await runWorker({ operation: "bind", repo, contractText: JSON.stringify(draft), output: path.join(dir, "contract.json") });
  const contractText = fs.readFileSync(bound.file, "utf8");
  const receipt = await runWorker({ operation: "inspect", repo, contractText, output: path.join(dir, "receipt") });
  assert.equal(receipt.status, "unchecked");
  assert.equal(receipt.acceptance, "pending-user-review");
  const checked = await runWorker({ operation: "run", repo, contractText, output: path.join(dir, "checked"), runChecks: ["baseline"] });
  assert.equal(checked.status, "verified");
  const summary = await vscode.workspace.openTextDocument(vscode.Uri.file(checked.file));
  await vscode.window.showTextDocument(summary);
  assert.match(summary.getText(), /pending-user-review/);
  console.log(`PASS Forge extension host: activation, commands, live diagnostics, worker binding, inspection, selected execution and receipt display. Artifacts: ${dir}`);
}
module.exports = { run };

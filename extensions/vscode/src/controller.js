"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Worker } = require("node:worker_threads");
const { validateContract } = require("../runtime/receipt/acceptance");
const { validateDraft } = require("../runtime/contract/bind");

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.js"), { workerData: data });
    let received = false;
    worker.once("message", (message) => {
      received = true;
      if (message.error) reject(new Error(message.error));
      else resolve(message.result);
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (!received) reject(new Error(`Forge worker exited without a result (${code})`));
    });
  });
}

function createController(vscode, execute = runWorker) {
  let busy = false;
  const requireTrust = () => {
    if (!vscode.workspace.isTrusted) throw new Error("Trust this workspace before binding or creating receipts.");
  };
  const diskPath = (uri) => {
    if (uri.scheme !== "file") throw new Error("Choose a file or folder on the extension host's disk.");
    return uri.fsPath;
  };
  async function chooseContract() {
    const picked = await vscode.window.showOpenDialog({ title: "Choose a Forge contract JSON file", canSelectMany: false, filters: { JSON: ["json"] } });
    if (!picked?.length) return;
    const file = diskPath(picked[0]);
    if (vscode.workspace.textDocuments.some((doc) => doc.uri.fsPath === file && doc.isDirty)) {
      throw new Error("Save the contract before continuing so the reviewed and bound contents match.");
    }
    return { file, contractText: await fs.readFile(file, "utf8") };
  }
  async function operate(operation) {
    if (busy) throw new Error("A Forge operation is already in progress.");
    requireTrust();
    busy = true;
    try {
      const chosen = await chooseContract();
      if (!chosen) return;
      const parsed = JSON.parse(chosen.contractText);
      if (operation === "bind") validateDraft(parsed);
      else validateContract(parsed);
      const folders = await vscode.window.showOpenDialog({ title: "Choose the repository root", canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
      if (!folders?.length) return;
      const repo = diskPath(folders[0]);
      let runChecks = [];
      if (operation === "run") {
        const items = parsed.checks.map((check) => ({
          label: check.id, description: JSON.stringify([check.command, ...check.args]),
          detail: `Timeout: ${check.timeoutMs} ms`, picked: false, id: check.id,
        }));
        if (!items.length) throw new Error("This contract declares no checks. Use Inspect Contract instead.");
        const selected = await vscode.window.showQuickPick(items, { canPickMany: true, title: "Select checks to execute", placeHolder: "Only selected checks will run" });
        if (!selected?.length) return;
        runChecks = selected.map((item) => item.id);
        const commands = parsed.checks.filter((check) => runChecks.includes(check.id));
        const confirmed = await vscode.window.showWarningMessage("Run these checks with your permissions?", {
          modal: true,
          detail: `Repository: ${repo}\n\n${commands.map((check) => `${check.id}: ${JSON.stringify([check.command, ...check.args])}\nTimeout: ${check.timeoutMs} ms`).join("\n\n")}\n\nReview referenced programs before running. Final acceptance remains yours.`,
        }, "Run selected checks");
        if (confirmed !== "Run selected checks") return;
      }
      const parents = await vscode.window.showOpenDialog({ title: "Choose an output folder outside the repository", canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
      if (!parents?.length) return;
      const name = `forge-${operation}-${crypto.randomUUID()}${operation === "bind" ? ".json" : ""}`;
      const output = path.join(diskPath(parents[0]), name);
      requireTrust();
      // Use the bytes reviewed above, never reread a changed contract before execution.
      const result = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: operation === "bind" ? "Binding contract" : "Creating acceptance receipt", cancellable: false },
        () => execute({ operation, repo, contractText: chosen.contractText, output, runChecks }));
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(result.file)), { preview: false });
      vscode.window.showInformationMessage(operation === "bind" ? "Contract bound. Claims remain unverified until checked." : `Evidence: ${result.status}. Final acceptance: ${result.acceptance}.`);
      return result;
    } finally { busy = false; }
  }
  return { operate, chooseContract };
}
module.exports = { createController, runWorker };

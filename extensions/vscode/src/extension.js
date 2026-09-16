"use strict";
const vscode = require("vscode");
const { validateDraft } = require("../runtime/contract/bind");
const { createController } = require("./controller");

function activate(context) {
  const controller = createController(vscode);
  const diagnostics = vscode.languages.createDiagnosticCollection("forge-contracts");
  context.subscriptions.push(diagnostics);
  const tracked = new Set();
  function validate(document, explicit = false) {
    const key = document.uri.toString();
    const text = document.getText();
    if (!explicit && !tracked.has(key) && !(document.languageId === "json" && /"handoff"\s*:/.test(text) && /"claims"\s*:/.test(text))) return;
    tracked.add(key);
    try {
      validateDraft(JSON.parse(text));
      diagnostics.delete(document.uri);
      if (explicit) vscode.window.showInformationMessage("Contract draft is valid. File bindings and claims have not been verified.");
    } catch (error) {
      const diagnostic = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), error.message, vscode.DiagnosticSeverity.Error);
      diagnostic.source = "Forge contract";
      diagnostics.set(document.uri, [diagnostic]);
    }
  }
  const register = (id, callback) => context.subscriptions.push(vscode.commands.registerCommand(id, async () => {
    try { return await callback(); }
    catch (error) { await vscode.window.showErrorMessage(`Forge: ${error.message}`); }
  }));
  register("forge.bindContract", () => controller.operate("bind"));
  register("forge.inspectReceipt", () => controller.operate("inspect"));
  register("forge.runChecks", () => controller.operate("run"));
  register("forge.validateContract", () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) throw new Error("Open a contract JSON document first.");
    validate(document, true);
  });
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => validate(doc)),
    vscode.workspace.onDidChangeTextDocument((event) => validate(event.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => { tracked.delete(doc.uri.toString()); diagnostics.delete(doc.uri); }),
  );
  vscode.workspace.textDocuments.forEach((doc) => validate(doc));
}
module.exports = { activate };

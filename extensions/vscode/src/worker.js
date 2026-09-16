"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { parentPort, workerData } = require("node:worker_threads");
const { bindContract } = require("../runtime/contract/bind");
const { createReceipt, validateContract, markdown, inside } = require("../runtime/receipt/acceptance");

function execute({ operation, repo, contractText, output, runChecks = [] }) {
  if (!["bind", "inspect", "run"].includes(operation)) throw new Error("Unknown operation");
  if (operation !== "run" && runChecks.length) throw new Error("Inspection and binding cannot execute checks");
  repo = fs.realpathSync(repo);
  const target = path.join(fs.realpathSync(path.dirname(output)), path.basename(output));
  if (inside(repo, target)) throw new Error("Output must be outside the repository");
  const contractBytes = Buffer.from(contractText, "utf8");
  if (operation === "bind") {
    const contract = bindContract({ repo, contractBytes });
    fs.writeFileSync(target, `${JSON.stringify(contract, null, 2)}\n`, { flag: "wx" });
    return { file: target, revision: contract.repository.revision };
  }
  validateContract(JSON.parse(contractText));
  // Reserve output before executing checks. Existing receipts are never overwritten.
  fs.mkdirSync(target);
  const receipt = createReceipt({ repo, contractBytes, runChecks });
  fs.writeFileSync(path.join(target, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  const file = path.join(target, "receipt.md");
  fs.writeFileSync(file, markdown(receipt), { flag: "wx" });
  return { file, status: receipt.status, acceptance: receipt.acceptance };
}

if (parentPort) {
  try { parentPort.postMessage({ result: execute(workerData) }); }
  catch (error) { parentPort.postMessage({ error: error.message }); }
}
module.exports = { execute };

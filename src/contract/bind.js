#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateContract, git, inside, snapshot } = require("../receipt/acceptance");

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function bindContract({ repo, contractBytes }) {
  const contract = JSON.parse(contractBytes.toString("utf8"));
  // Drafts may omit generated values. Validate everything else before reading paths.
  if (contract && typeof contract === "object") {
    if (contract.repository === undefined) contract.repository = {};
    if (contract.repository && typeof contract.repository === "object" && !Array.isArray(contract.repository)) {
      contract.repository.revision ??= "0".repeat(40);
    }
    const files = [contract.handoff, ...(Array.isArray(contract.files) ? contract.files : [])];
    for (const file of files) {
      if (file && typeof file === "object" && !Array.isArray(file)) file.sha256 ??= "0".repeat(64);
    }
  }
  validateContract(contract);
  repo = fs.realpathSync(repo);
  requireThat(repo === fs.realpathSync(git(repo, ["rev-parse", "--show-toplevel"])), "--repo must name the repository root");
  const before = snapshot(repo, contract);
  requireThat(before.worktreeStatus === "", "repository must be clean, including untracked files");
  for (const file of before.files) {
    requireThat(file.actualSha256 !== null, `${file.path}: ${file.reason}`);
  }
  const after = snapshot(repo, contract);
  requireThat(JSON.stringify(before) === JSON.stringify(after), "repository changed during binding; retry with a stable tree");
  contract.repository.revision = before.revision;
  [contract.handoff, ...contract.files].forEach((file, index) => {
    file.sha256 = before.files[index].actualSha256;
  });
  return validateContract(contract);
}

function main(args) {
  const options = {};
  const names = { "--repo": "repo", "--contract": "contract", "--out": "out" };
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    requireThat(Object.hasOwn(names, flag) && options[names[flag]] === undefined, `unknown or duplicate option: ${flag}`);
    requireThat(value && !value.startsWith("--"), `missing value for ${flag}`);
    options[names[flag]] = value;
  }
  requireThat(options.repo && options.contract && options.out,
    "usage: node src/contract/bind.js --repo PATH --contract DRAFT_FILE --out NEW_FILE");
  const repo = fs.realpathSync(options.repo);
  const output = path.resolve(options.out);
  const parent = fs.realpathSync(path.dirname(output));
  const target = path.join(parent, path.basename(output));
  requireThat(!inside(repo, target), "output file must be outside repository");
  const contract = bindContract({ repo, contractBytes: fs.readFileSync(options.contract) });
  fs.writeFileSync(target, `${JSON.stringify(contract, null, 2)}\n`, { flag: "wx" });
  console.log(`contract-bind: bound ${1 + contract.files.length} files at ${contract.repository.revision}; ${target}`);
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`contract-bind: ${error.message}`); process.exitCode = 2; }
}

module.exports = { bindContract, main };

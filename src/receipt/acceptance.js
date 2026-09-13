#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hashPattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-z][a-z0-9-]{0,63}$/;

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

function object(value, keys, label) {
  requireThat(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  requireThat(Object.keys(value).every((key) => keys.includes(key)), `${label}: unknown field`);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("\0");
}

function relativeFile(value) {
  return text(value) && !value.includes("\\") && !value.includes(":") &&
    !path.posix.isAbsolute(value) && value.split("/").every((part) => part && part !== "." && part !== ".." && part !== ".git");
}

function validateContract(contract) {
  object(contract, ["schemaVersion", "repository", "handoff", "files", "checks", "claims"], "contract");
  requireThat(contract.schemaVersion === "1.0.0", "unsupported schemaVersion");
  object(contract.repository, ["revision"], "repository");
  requireThat(typeof contract.repository.revision === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(contract.repository.revision), "repository.revision must be a full lowercase commit hash");
  const validateFile = (file) => {
    object(file, ["path", "sha256"], "file binding");
    requireThat(relativeFile(file.path), "file path must be a normalized repository-relative path outside .git");
    requireThat(typeof file.sha256 === "string" && hashPattern.test(file.sha256), "file sha256 must be 64 lowercase hex characters");
  };
  validateFile(contract.handoff);
  requireThat(Array.isArray(contract.files), "files must be an array");
  contract.files.forEach(validateFile);
  const paths = [contract.handoff, ...contract.files].map((file) => file.path);
  requireThat(new Set(paths).size === paths.length, "duplicate file binding");
  requireThat(Array.isArray(contract.checks), "checks must be an array");
  const checkIds = new Set();
  for (const check of contract.checks) {
    object(check, ["id", "command", "args", "timeoutMs"], "check");
    requireThat(typeof check.id === "string" && idPattern.test(check.id) && !checkIds.has(check.id), "invalid or duplicate check id");
    checkIds.add(check.id);
    requireThat(text(check.command), `${check.id}: command required`);
    requireThat(Array.isArray(check.args) && check.args.every((arg) => typeof arg === "string" && !arg.includes("\0")), `${check.id}: args must be strings`);
    requireThat(Number.isInteger(check.timeoutMs) && check.timeoutMs >= 1 && check.timeoutMs <= 60000, `${check.id}: timeoutMs must be 1..60000`);
  }
  requireThat(Array.isArray(contract.claims) && contract.claims.length > 0, "at least one claim required");
  const claimIds = new Set();
  for (const claim of contract.claims) {
    object(claim, ["id", "text", "checks"], "claim");
    requireThat(typeof claim.id === "string" && idPattern.test(claim.id) && !claimIds.has(claim.id), "invalid or duplicate claim id");
    claimIds.add(claim.id);
    requireThat(text(claim.text), `${claim.id}: text required`);
    requireThat(Array.isArray(claim.checks) && new Set(claim.checks).size === claim.checks.length && claim.checks.every((id) => checkIds.has(id)), `${claim.id}: checks must reference unique declared check ids`);
  }
  return contract;
}

function git(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.error?.message || result.stderr.trim()}`);
  return result.stdout.trim();
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function inspectFile(repo, binding) {
  try {
    const target = fs.realpathSync(path.join(repo, binding.path));
    requireThat(inside(repo, target), "file resolves outside repository");
    requireThat(!path.relative(repo, target).split(path.sep).includes(".git"), "file resolves into .git");
    requireThat(fs.statSync(target).isFile(), "binding is not a regular file");
    const actualSha256 = sha256(fs.readFileSync(target));
    return { ...binding, actualSha256, status: actualSha256 === binding.sha256 ? "verified" : "disputed" };
  } catch (error) {
    return { ...binding, actualSha256: null, status: "disputed", reason: error.message };
  }
}

function snapshot(repo, contract) {
  return {
    revision: git(repo, ["rev-parse", "HEAD"]),
    // Disable fsmonitor and force an index refresh through status.
    worktreeStatus: git(repo, ["-c", "core.fsmonitor=false", "status", "--porcelain=v1", "--untracked-files=all"]),
    files: [contract.handoff, ...contract.files].map((binding) => inspectFile(repo, binding)),
  };
}

function bindingStatus(state, contract) {
  return state.revision === contract.repository.revision && state.worktreeStatus === "" &&
    state.files.every((file) => file.status === "verified") ? "verified" : "disputed";
}

function aggregate(statuses) {
  if (statuses.includes("disputed")) return "disputed";
  return statuses.length > 0 && statuses.every((status) => status === "verified") ? "verified" : "unchecked";
}

function createReceipt({ repo, contractBytes, runChecks = [] }) {
  const contract = validateContract(JSON.parse(contractBytes.toString("utf8")));
  requireThat(Array.isArray(runChecks) && new Set(runChecks).size === runChecks.length && runChecks.every((id) => contract.checks.some((check) => check.id === id)), "selected check ids must be unique and declared");
  repo = fs.realpathSync(repo);
  const gitRoot = fs.realpathSync(git(repo, ["rev-parse", "--show-toplevel"]));
  requireThat(repo === gitRoot, "--repo must name the repository root");
  const startedAt = new Date().toISOString();
  const before = snapshot(repo, contract);
  let stable = bindingStatus(before, contract) === "verified";
  const checks = [];
  for (const check of contract.checks) {
    const record = { ...check, status: "unchecked", exitCode: null, signal: null, stdout: "", stderr: "" };
    checks.push(record);
    if (!runChecks.includes(check.id)) {
      record.reason = "not selected by receiver";
      continue;
    }
    if (!stable) {
      record.reason = "input binding failed; execution blocked";
      continue;
    }
    record.startedAt = new Date().toISOString();
    const result = spawnSync(check.command, check.args, {
      cwd: repo, encoding: "utf8", shell: false, timeout: check.timeoutMs,
      killSignal: "SIGKILL", maxBuffer: 1024 * 1024, windowsHide: true,
    });
    record.finishedAt = new Date().toISOString();
    record.exitCode = result.status;
    record.signal = result.signal;
    record.stdout = result.stdout || "";
    record.stderr = result.stderr || "";
    record.status = result.error || result.status !== 0 ? "disputed" : "verified";
    if (result.error) record.reason = `${result.error.code}: ${result.error.message}`;
    // A check that changes its inputs must not certify the initial snapshot.
    const current = snapshot(repo, contract);
    stable = bindingStatus(current, contract) === "verified" && JSON.stringify(current) === JSON.stringify(before);
    if (!stable) {
      record.status = "disputed";
      record.reason = "repository changed during check; later execution blocked";
    }
  }
  const after = snapshot(repo, contract);
  const binding = stable && bindingStatus(after, contract) === "verified" && JSON.stringify(before) === JSON.stringify(after) ? "verified" : "disputed";
  const claims = contract.claims.map((claim) => ({
    ...claim,
    status: binding === "disputed" ? "disputed" : aggregate(claim.checks.map((id) => checks.find((check) => check.id === id).status)),
    evidence: claim.checks.map((id) => `#/checks/${checks.findIndex((check) => check.id === id)}`),
  }));
  const status = aggregate([binding, ...checks.map((check) => check.status), ...claims.map((claim) => claim.status)]);
  return {
    schemaVersion: "1.0.0", kind: "forge-acceptance-receipt", id: crypto.randomUUID(),
    startedAt, finishedAt: new Date().toISOString(),
    contractSha256: sha256(contractBytes), contract,
    repository: { path: repo, expectedRevision: contract.repository.revision, binding, before, after },
    execution: { selectedChecks: runChecks, node: process.version, platform: process.platform },
    checks, claims, status,
    acceptance: "pending-user-review",
  };
}

function markdown(receipt) {
  const escape = (value) => String(value).replace(/[&<>|`\r\n]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "|": "&#124;", "`": "&#96;", "\r": " ", "\n": " " })[char]);
  return [
    "# Handoff Acceptance Receipt", "",
    `Evidence status: **${receipt.status}**. Final acceptance: **${receipt.acceptance}**.`, "",
    `Receipt: ${receipt.id}`, `Contract SHA-256: ${receipt.contractSha256}`, "",
    `Expected revision: ${receipt.repository.expectedRevision}`,
    `Observed revision: ${receipt.repository.before.revision}`,
    `Working tree before checks: ${receipt.repository.before.worktreeStatus ? "dirty" : "clean"}`,
    `Working tree after checks: ${receipt.repository.after.worktreeStatus ? "dirty" : "clean"}`,
    `Input binding: **${receipt.repository.binding}**`, "",
    "## Claims", "", "| Claim | Status | Check evidence |", "|---|---|---|",
    ...receipt.claims.map((claim) => `| ${escape(claim.text)} | ${claim.status} | ${escape(claim.checks.join(", ") || "none")} |`), "",
    "## Checks", "", "| Check | Status | Exit | Detail |", "|---|---|---|---|",
    ...receipt.checks.map((check) => `| ${check.id} | ${check.status} | ${check.exitCode ?? "—"} | ${escape(check.reason || "command exited zero")} |`), "",
    "## Input files", "", "| Path | Status before checks |", "|---|---|",
    ...receipt.repository.before.files.map((file) => `| ${escape(file.path)} | ${file.status} |`), "",
    "Full arguments, timestamps, output, file hashes, and before/after repository state are in receipt.json.", "",
    "Verified means the declared checks exited zero against matching inputs. It does not establish check quality, full handoff conformance, or user acceptance. This receipt is unsigned and is not a tamper-resistant attestation.", "",
  ].join("\n");
}

function main(args) {
  const options = { runChecks: [] };
  const names = { "--repo": "repo", "--contract": "contract", "--out": "out" };
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    requireThat(value && !value.startsWith("--"), `missing value for ${flag}`);
    if (flag === "--run-check") options.runChecks.push(value);
    else {
      requireThat(Object.hasOwn(names, flag) && options[names[flag]] === undefined, `unknown or duplicate option: ${flag}`);
      options[names[flag]] = value;
    }
  }
  requireThat(options.repo && options.contract && options.out, "usage: node src/receipt/acceptance.js --repo PATH --contract FILE --out NEW_DIRECTORY [--run-check ID ...]");
  // Reserve an external output directory before any selected commands execute.
  const repo = fs.realpathSync(options.repo);
  const output = path.resolve(options.out);
  const outputParent = fs.realpathSync(path.dirname(output));
  requireThat(!inside(repo, path.join(outputParent, path.basename(output))), "output directory must be outside repository");
  const contractBytes = fs.readFileSync(options.contract);
  validateContract(JSON.parse(contractBytes.toString("utf8")));
  fs.mkdirSync(output); // Exclusive: never overwrite a prior receipt.
  const receipt = createReceipt({ repo, contractBytes, runChecks: options.runChecks });
  fs.writeFileSync(path.join(output, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  fs.writeFileSync(path.join(output, "receipt.md"), markdown(receipt), { flag: "wx" });
  console.log(`acceptance-receipt: ${receipt.status}; pending-user-review; ${output}`);
  return receipt.status === "verified" ? 0 : 1;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`acceptance-receipt: ${error.message}`); process.exitCode = 2; }
}

module.exports = { createReceipt, validateContract, markdown, sha256, main };

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const forge = (args, cwd = rootDir) => spawnSync(process.execPath, [path.join(rootDir, "src", "cli.js"), ...args], { cwd, encoding: "utf8" });

test("forge --help lists every subcommand", () => {
  const result = forge(["--help"]);
  assert.equal(result.status, 0);
  for (const command of ["validate", "bind", "receipt", "lint"]) assert.match(result.stdout, new RegExp(`^  ${command} `, "m"));
  assert.equal(forge([]).status, 2);
  assert.equal(forge(["--version"]).stdout.trim(), require("../package.json").version);
});

test("forge validate resolves paths from the current directory", () => {
  const result = forge(["validate", "example-handoff.md", "--level", "HC-3", "--contract", "example-handoff.contract.json"], path.join(rootDir, "examples"));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /example-handoff\.md conforms to HC-3/);
});

test("forge keeps each tool's exit codes and error prefixes", () => {
  const bind = forge(["bind", "--repo"]);
  assert.equal(bind.status, 2);
  assert.match(bind.stderr, /^contract-bind: /);
  const receipt = forge(["receipt"]);
  assert.equal(receipt.status, 2);
  assert.match(receipt.stderr, /^acceptance-receipt: /);
  assert.equal(forge(["validate", "missing.md"]).status, 1);
  assert.equal(forge(["lint"]).status, 2);
  assert.equal(forge(["no-such-command"]).status, 2);
});

test("forge lint runs against the current directory", () => {
  assert.equal(forge(["lint", "terms"]).status, 0);
  assert.equal(forge(["lint", "spec"]).status, 0);
});

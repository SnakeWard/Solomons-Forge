const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const lintScript = path.join(rootDir, "src", "lint", "term-leak.js");
const lexicon = JSON.parse(fs.readFileSync(path.join(rootDir, "lexicon.json"), "utf8"));

function runLint() {
  return spawnSync(process.execPath, [lintScript], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

test("clean repository scan exits zero", () => {
  const result = runLint();

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 violations/);
});

test("seeded vocabulary violation is reported", () => {
  const entry = lexicon.entries.find((item) => item.linter_patterns.length > 0);
  assert.ok(entry);

  const seededRelativePath = path.join("docs", "__term-leak-seed.md");
  const seededPath = path.join(rootDir, seededRelativePath);

  try {
    fs.writeFileSync(seededPath, `${entry.internal_term}\n`, "utf8");

    const result = runLint();
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, /docs\/__term-leak-seed\.md:1:/);
    assert.match(output, new RegExp(entry.linter_patterns[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(output, new RegExp(entry.public_term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    fs.rmSync(seededPath, { force: true });
  }
});

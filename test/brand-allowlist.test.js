const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const lintScript = path.join(rootDir, "src", "lint", "term-leak.js");
const lexicon = JSON.parse(fs.readFileSync(path.join(rootDir, "lexicon.json"), "utf8"));
const tempDir = path.join(rootDir, "test", "__brand-tmp");
const allowedString = lexicon.brand_allowlist.allowed_strings[0];
const disallowedPiece = allowedString.split("'")[0];
const trackedPattern = lexicon.entries.find((entry) => entry.linter_patterns.length > 0).linter_patterns[0];

function runLint(args = []) {
  return spawnSync(process.execPath, [lintScript, ...args], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

function escapedRegex(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

test("committed repository passes term scan", () => {
  const result = runLint();

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 violations/);
});

test("allowed brand text fails outside listed paths", () => {
  const tempRelative = "__brand-outside.md";
  const tempPath = path.join(rootDir, tempRelative);

  try {
    fs.writeFileSync(tempPath, `${allowedString}\n`, "utf8");

    const result = runLint();
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, new RegExp(`${tempRelative}:1:`));
    assert.match(output, escapedRegex(trackedPattern));
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
});

test("unlisted text fails even when path is listed", () => {
  const tempRelative = "test/__brand-tmp/allowlisted.md";
  const tempPath = path.join(rootDir, tempRelative);
  const tempLexiconRelative = "test/__brand-tmp/lexicon.json";
  const tempLexiconPath = path.join(rootDir, tempLexiconRelative);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempPath, `${allowedString}\n${disallowedPiece} alone\n`, "utf8");

    const tempLexicon = {
      ...lexicon,
      brand_allowlist: {
        ...lexicon.brand_allowlist,
        allowed_strings: [allowedString],
        allowed_files: [...lexicon.brand_allowlist.allowed_files, tempRelative],
      },
      linter_policy: {
        ...lexicon.linter_policy,
        excluded_paths: [...lexicon.linter_policy.excluded_paths, tempLexiconRelative],
      },
    };

    fs.writeFileSync(tempLexiconPath, `${JSON.stringify(tempLexicon, null, 2)}\n`, "utf8");

    const result = runLint([tempLexiconRelative]);
    const output = `${result.stdout}${result.stderr}`;
    const violationLines = output
      .split(/\r?\n/)
      .filter((line) => line.includes(": pattern "));

    assert.equal(result.status, 1, output);
    assert.deepEqual(violationLines, [`${tempRelative}:2: pattern ${trackedPattern} -> ${lexicon.entries[0].public_term}`]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

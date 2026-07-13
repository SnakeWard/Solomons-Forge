const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const validatorScript = path.join(rootDir, "src", "validate", "handoff.js");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "spec", "handoff-conformance.json"), "utf8"));
const exampleRelative = "examples/example-handoff.md";
const examplePath = path.join(rootDir, exampleRelative);
const tempDir = path.join(rootDir, "test", "__handoff-tmp");

function runValidator(args) {
  return spawnSync(process.execPath, [validatorScript, ...args], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

function requiredSections() {
  return manifest.conformance_levels["HC-1"].required_sections;
}

function removeSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(heading));
  assert.notEqual(start, -1);

  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const end = next === -1 ? lines.length : next;

  lines.splice(start, end - start);
  return lines.join("\n");
}

function sectionBounds(lines, heading) {
  const start = lines.findIndex((line) => line.startsWith(heading));
  assert.notEqual(start, -1);

  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return {
    start,
    end: next === -1 ? lines.length : next,
  };
}

test("example handoff conforms at HC-2", () => {
  const result = runValidator([exampleRelative]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /conforms to HC-2/);
});

test("missing required section fails HC-1", () => {
  const heading = requiredSections().find((item) => item.endsWith("Preservation Map"));
  const tempRelative = "test/__handoff-tmp/missing-section.md";
  const tempPath = path.join(rootDir, tempRelative);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempPath, removeSection(fs.readFileSync(examplePath, "utf8"), heading), "utf8");

    const result = runValidator([tempRelative, "--level", "HC-1"]);
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("unlabeled status item fails HC-2 but passes HC-1", () => {
  const heading = requiredSections().find((item) => item.endsWith("Status Declaration"));
  const tempRelative = "test/__handoff-tmp/unlabeled-status.md";
  const tempPath = path.join(rootDir, tempRelative);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    const lines = fs.readFileSync(examplePath, "utf8").split(/\r?\n/);
    const bounds = sectionBounds(lines, heading);
    const labelRegex = new RegExp(manifest.conformance_levels["HC-2"].label_pattern);
    const itemIndex = lines.findIndex((line, index) => {
      const trimmed = line.trimStart();
      return index > bounds.start && index < bounds.end && (trimmed.startsWith("- ") || trimmed.startsWith("* "));
    });
    assert.notEqual(itemIndex, -1);

    lines[itemIndex] = lines[itemIndex].replace(labelRegex, "");
    fs.writeFileSync(tempPath, lines.join("\n"), "utf8");

    const hc2 = runValidator([tempRelative]);
    const hc2Output = `${hc2.stdout}${hc2.stderr}`;
    assert.equal(hc2.status, 1, hc2Output);
    assert.match(hc2Output, new RegExp(`${itemIndex + 1}: unlabeled status declaration item`));

    const hc1 = runValidator([tempRelative, "--level", "HC-1"]);
    assert.equal(hc1.status, 0, `${hc1.stdout}${hc1.stderr}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("nonexistent handoff path reports readable error", () => {
  const result = runValidator(["test/__handoff-tmp/does-not-exist.md"]);
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 1, output);
  assert.match(output, /file not found/);
});

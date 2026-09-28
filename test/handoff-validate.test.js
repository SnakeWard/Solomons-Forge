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

const contractRelative = "examples/example-handoff.contract.json";

function hc3Fixture(t, mutate) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(require("node:os").tmpdir()), "forge-hc3-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const contract = JSON.parse(fs.readFileSync(path.join(rootDir, contractRelative), "utf8"));
  const handoff = fs.readFileSync(examplePath);
  mutate?.(contract, handoff);
  const contractPath = path.join(dir, "contract.json");
  fs.writeFileSync(contractPath, JSON.stringify(contract));
  return contractPath;
}

test("HC-3 passes when every checklist item maps to a claim with a check", () => {
  const result = runValidator([exampleRelative, "--level", "HC-3", "--contract", contractRelative]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /conforms to HC-3/);
});

test("HC-3 requires a contract, and a contract requires HC-3", () => {
  assert.match(runValidator([exampleRelative, "--level", "HC-3"]).stderr, /HC-3 requires --contract/);
  assert.match(runValidator([exampleRelative, "--contract", contractRelative]).stderr, /--contract applies only to --level HC-3/);
});

test("HC-3 fails when a checklist item has no matching claim", (t) => {
  const contractPath = hc3Fixture(t, (contract) => {
    contract.claims = contract.claims.filter((claim) => claim.id !== "round-trip-lossless");
  });
  const result = runValidator([exampleRelative, "--level", "HC-3", "--contract", contractPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no contract claim with the same text: "Export-then-import round-trips/);
});

test("HC-3 fails when a mapped claim references no check", (t) => {
  const contractPath = hc3Fixture(t, (contract) => {
    contract.claims.find((claim) => claim.id === "no-regressions").checks = [];
  });
  const result = runValidator([exampleRelative, "--level", "HC-3", "--contract", contractPath]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /claim no-regressions maps this checklist item to no check/);
});

test("HC-3 checks the handoff digest when the contract names one", (t) => {
  const bound = hc3Fixture(t, (contract, handoff) => {
    contract.handoff.sha256 = require("node:crypto").createHash("sha256").update(handoff).digest("hex");
  });
  assert.equal(runValidator([exampleRelative, "--level", "HC-3", "--contract", bound]).status, 0);

  const other = hc3Fixture(t, (contract) => {
    contract.handoff.sha256 = "1".repeat(64);
  });
  const result = runValidator([exampleRelative, "--level", "HC-3", "--contract", other]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contract binds a different handoff/);
});

test("HC-3 rejects an invalid or missing contract", (t) => {
  const invalid = hc3Fixture(t, (contract) => {
    contract.claims = [];
  });
  assert.match(runValidator([exampleRelative, "--level", "HC-3", "--contract", invalid]).stderr, /at least one claim required/);
  assert.match(runValidator([exampleRelative, "--level", "HC-3", "--contract", path.join(rootDir, "missing.json")]).stderr, /contract .*missing\.json/);
});

test("checklist items join wrapped lines and drop checkbox markers", () => {
  const { checklistItems } = require("../src/validate/handoff");
  const items = checklistItems({ start: 0, lines: ["- [ ] First item", "  continues here.", "* [x] Second", "", "not an item"] });
  assert.deepEqual(items.map((item) => item.text), ["First item continues here.", "Second"]);
});

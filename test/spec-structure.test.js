const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const validatorScript = path.join(rootDir, "src", "lint", "spec-structure.js");
const manifestPath = path.join(rootDir, "spec", "spec-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function runValidator(extraArgs = []) {
  return spawnSync(process.execPath, [validatorScript, ...extraArgs], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

test("valid specs pass structural validation", () => {
  const result = runValidator();

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 violations/);
});

test("missing required heading is reported", () => {
  const tempDir = path.join(rootDir, "test", "__spec-structure-tmp");
  const sourceSpec = path.join(rootDir, manifest.specs[0].file);
  const tempSpecRelative = "test/__spec-structure-tmp/core-invariants.md";
  const tempSpec = path.join(rootDir, tempSpecRelative);
  const tempManifestRelative = "test/__spec-structure-tmp/spec-manifest.json";
  const tempManifest = path.join(rootDir, tempManifestRelative);
  const missingHeading = manifest.specs[0].required_headings[1];

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    const original = fs.readFileSync(sourceSpec, "utf8");
    const broken = original
      .split(/\r?\n/)
      .filter((line) => line !== missingHeading)
      .join("\n");

    fs.writeFileSync(tempSpec, broken, "utf8");
    fs.writeFileSync(
      tempManifest,
      JSON.stringify(
        {
          manifest_version: "1.0.0",
          specs: [
            {
              file: tempSpecRelative,
              required_headings: manifest.specs[0].required_headings,
              required_metadata: manifest.specs[0].required_metadata,
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = runValidator([tempManifestRelative]);
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, /test\/__spec-structure-tmp\/core-invariants\.md/);
    assert.match(output, new RegExp(missingHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

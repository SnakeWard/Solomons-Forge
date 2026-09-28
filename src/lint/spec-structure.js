#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "../..");

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function readManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function validateSpec(spec, rootDir) {
  const filePath = path.resolve(rootDir, spec.file);
  const displayPath = toPosixPath(spec.file);
  const failures = [];

  if (!fs.existsSync(filePath)) {
    return [{ file: displayPath, item: "file exists" }];
  }

  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);

  for (const heading of spec.required_headings) {
    if (!lines.some((line) => line.startsWith(heading))) {
      failures.push({ file: displayPath, item: heading });
    }
  }

  for (const metadata of spec.required_metadata) {
    if (!text.includes(metadata)) {
      failures.push({ file: displayPath, item: metadata });
    }
  }

  return failures;
}

// root is the repository whose specs are checked; the manifest path is resolved against it.
function main(argv, { root = packageRoot } = {}) {
  const rootDir = path.resolve(root);
  const manifest = readManifest(path.resolve(rootDir, argv[0] || path.join("spec", "spec-manifest.json")));
  const failures = manifest.specs.flatMap((spec) => validateSpec(spec, rootDir));

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.file}: missing ${failure.item}`);
    }
    return 1;
  }

  console.log(`spec-structure: ${manifest.specs.length} specs checked, 0 violations`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main };

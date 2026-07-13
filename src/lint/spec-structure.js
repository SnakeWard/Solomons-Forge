#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const defaultManifestPath = path.join(rootDir, "spec", "spec-manifest.json");
const manifestPath = path.resolve(rootDir, process.argv[2] || defaultManifestPath);

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function validateSpec(spec) {
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

function run() {
  const manifest = readManifest();
  const failures = manifest.specs.flatMap(validateSpec);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.file}: missing ${failure.item}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`spec-structure: ${manifest.specs.length} specs checked, 0 violations`);
}

run();

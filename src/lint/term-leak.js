#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const lexiconPath = path.join(rootDir, "lexicon.json");

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(glob) {
  let source = "^";

  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];

    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegex(char);
    }
  }

  return new RegExp(`${source}$`);
}

function readLexicon() {
  return JSON.parse(fs.readFileSync(lexiconPath, "utf8"));
}

function collectRules(lexicon) {
  return lexicon.entries.flatMap((entry) =>
    entry.linter_patterns.map((pattern) => ({
      pattern,
      regex: new RegExp(pattern, "g"),
      replacement: entry.public_term,
    })),
  );
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function matchingFiles(policy) {
  const include = policy.file_globs.map(globToRegex);
  const exclude = policy.excluded_paths.map(globToRegex);

  return walkFiles(rootDir)
    .map((filePath) => ({
      fullPath: filePath,
      relativePath: toPosixPath(path.relative(rootDir, filePath)),
    }))
    .filter(({ relativePath }) => include.some((regex) => regex.test(relativePath)))
    .filter(({ relativePath }) => !exclude.some((regex) => regex.test(relativePath)))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function scanFile(file, rules) {
  const text = fs.readFileSync(file.fullPath, "utf8");
  const lines = text.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    for (const rule of rules) {
      rule.regex.lastIndex = 0;

      let match = rule.regex.exec(line);
      while (match !== null) {
        violations.push({
          file: file.relativePath,
          line: index + 1,
          pattern: rule.pattern,
          replacement: rule.replacement,
        });

        if (match[0] === "") {
          rule.regex.lastIndex += 1;
        }

        match = rule.regex.exec(line);
      }
    }
  });

  return violations;
}

function run() {
  const lexicon = readLexicon();
  const rules = collectRules(lexicon);
  const files = matchingFiles(lexicon.linter_policy);
  const violations = files.flatMap((file) => scanFile(file, rules));

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `${violation.file}:${violation.line}: pattern ${violation.pattern} -> ${violation.replacement}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`term-leak: ${files.length} files scanned, 0 violations`);
}

run();

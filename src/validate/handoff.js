#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../..");
const manifestPath = path.join(rootDir, "spec", "handoff-conformance.json");
const defaultLevel = "HC-2";

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function displayPath(inputPath, resolvedPath) {
  if (!path.isAbsolute(inputPath)) {
    return toPosixPath(inputPath);
  }

  const relativePath = path.relative(rootDir, resolvedPath);
  if (!relativePath.startsWith("..")) {
    return toPosixPath(relativePath);
  }

  return toPosixPath(inputPath);
}

function parseArgs(args, supportedLevels) {
  if (args.length === 0) {
    return { error: `usage: node src/validate/handoff.js <path-to-handoff.md> [--level ${supportedLevels.join("|")}]` };
  }

  const result = {
    file: args[0],
    level: defaultLevel,
  };

  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== "--level") {
      return { error: `unknown argument: ${args[index]}` };
    }

    const value = args[index + 1];
    if (!value) {
      return { error: "--level requires a value" };
    }

    result.level = value;
    index += 1;
  }

  if (!supportedLevels.includes(result.level)) {
    return { error: `unsupported level: ${result.level}` };
  }

  return result;
}

function requiredSectionsForLevel(manifest, levelName) {
  const level = manifest.conformance_levels[levelName];

  if (Array.isArray(level.required_sections)) {
    return level.required_sections;
  }

  if (level.inherits) {
    return requiredSectionsForLevel(manifest, level.inherits);
  }

  return [];
}

function sectionHeadingFromRule(ruleName, requiredSections) {
  const sectionName = ruleName
    .replace(/_rule$/, "")
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return requiredSections.find((heading) => heading.replace(/^#+\s*/, "") === sectionName);
}

function findSection(lines, heading) {
  const start = lines.findIndex((line) => line.startsWith(heading));

  if (start === -1) {
    return null;
  }

  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const end = next === -1 ? lines.length : next;

  return {
    heading,
    start,
    end,
    lines: lines.slice(start + 1, end),
  };
}

function validateHc1(display, lines, requiredSections) {
  const failures = [];

  for (const heading of requiredSections) {
    const section = findSection(lines, heading);

    if (!section) {
      failures.push(`${display}: missing section ${heading}`);
      continue;
    }

    if (section.lines.join("\n").trim().length === 0) {
      failures.push(`${display}: empty section ${heading}`);
    }
  }

  return failures;
}

function validateHc2(display, lines, manifest, requiredSections) {
  const level = manifest.conformance_levels["HC-2"];
  const failures = [];
  const labelRegex = new RegExp(level.label_pattern);
  const contextHeading = sectionHeadingFromRule("context_rule", requiredSections);
  const statusHeading = sectionHeadingFromRule("status_declaration_rule", requiredSections);

  if (contextHeading) {
    const contextSection = findSection(lines, contextHeading);
    if (contextSection && !labelRegex.test(contextSection.lines.join("\n"))) {
      failures.push(`${display}: ${contextHeading} missing required status label`);
    }
  }

  if (statusHeading) {
    const statusSection = findSection(lines, statusHeading);
    if (statusSection) {
      statusSection.lines.forEach((line, index) => {
        const trimmed = line.trimStart();
        if ((trimmed.startsWith("- ") || trimmed.startsWith("* ")) && !labelRegex.test(line)) {
          failures.push(`${display}:${statusSection.start + index + 2}: unlabeled status declaration item`);
        }
      });
    }
  }

  return failures;
}

function supportedLevels(manifest) {
  return Object.entries(manifest.conformance_levels)
    .filter(([, level]) => level.mechanically_checkable !== false)
    .map(([name]) => name);
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const levels = supportedLevels(manifest);
  const args = parseArgs(process.argv.slice(2), levels);

  if (args.error) {
    console.error(args.error);
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(rootDir, args.file);
  const display = displayPath(args.file, filePath);

  if (!fs.existsSync(filePath)) {
    console.error(`${display}: file not found`);
    process.exitCode = 1;
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const requiredSections = requiredSectionsForLevel(manifest, args.level);
  const failures = validateHc1(display, lines, requiredSections);

  if (args.level === "HC-2") {
    failures.push(...validateHc2(display, lines, manifest, requiredSections));
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`handoff-conformance: ${display} conforms to ${args.level}`);
}

run();

#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const rootDir = path.resolve(__dirname, "../..");
const manifestPath = path.join(rootDir, "spec", "handoff-conformance.json");
const defaultLevel = "HC-2";

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function displayPath(inputPath, resolvedPath, root) {
  if (!path.isAbsolute(inputPath)) {
    return toPosixPath(inputPath);
  }

  const relativePath = path.relative(root, resolvedPath);
  if (!relativePath.startsWith("..")) {
    return toPosixPath(relativePath);
  }

  return toPosixPath(inputPath);
}

function parseArgs(args, supportedLevels) {
  if (args.length === 0) {
    return { error: `usage: node src/validate/handoff.js <path-to-handoff.md> [--level ${supportedLevels.join("|")}] [--contract CONTRACT_FILE]` };
  }

  const result = {
    file: args[0],
    level: defaultLevel,
    contract: null,
  };

  for (let index = 1; index < args.length; index += 1) {
    const flag = args[index];
    if (flag !== "--level" && flag !== "--contract") {
      return { error: `unknown argument: ${flag}` };
    }

    const value = args[index + 1];
    if (!value) {
      return { error: `${flag} requires a value` };
    }

    if (flag === "--level") {
      result.level = value;
    } else {
      result.contract = value;
    }
    index += 1;
  }

  if (!supportedLevels.includes(result.level)) {
    return { error: `unsupported level: ${result.level}` };
  }

  if (result.level === "HC-3" && !result.contract) {
    return { error: "HC-3 requires --contract CONTRACT_FILE" };
  }

  if (result.level !== "HC-3" && result.contract) {
    return { error: "--contract applies only to --level HC-3" };
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

const normalizeText = (value) => value.replace(/\s+/g, " ").trim();

// Checklist items start with "- " or "* "; indented lines that follow continue the item.
function checklistItems(section) {
  const items = [];
  section.lines.forEach((line, index) => {
    const item = line.match(/^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.*)$/);
    if (item) {
      items.push({ line: section.start + index + 2, text: item[1] });
    } else if (items.length > 0 && line.trim().length > 0 && /^\s/.test(line)) {
      items[items.length - 1].text += ` ${line.trim()}`;
    }
  });
  return items.map((item) => ({ ...item, text: normalizeText(item.text) }));
}

function validateHc3(display, lines, bytes, contractFile, requiredSections, root) {
  const failures = [];
  const { validateDraft } = require("../contract/bind");
  let raw;
  let contract;

  try {
    raw = JSON.parse(fs.readFileSync(path.resolve(root, contractFile), "utf8"));
    contract = validateDraft(raw);
  } catch (error) {
    return [`${display}: contract ${toPosixPath(contractFile)}: ${error.message}`];
  }

  // A bound contract names the exact handoff bytes; a draft may omit the digest.
  const digest = raw.handoff && raw.handoff.sha256;
  if (digest !== undefined) {
    const actual = crypto.createHash("sha256").update(bytes).digest("hex");
    if (digest !== actual) {
      failures.push(`${display}: contract binds a different handoff (sha256 ${digest}, file is ${actual})`);
    }
  }

  const heading = requiredSections.find((name) => name === "## Validation Checklist");
  const section = heading && findSection(lines, heading);
  const items = section ? checklistItems(section) : [];
  if (items.length === 0) {
    failures.push(`${display}: ## Validation Checklist has no items to map`);
  }

  const claims = new Map(contract.claims.map((claim) => [normalizeText(claim.text), claim]));
  for (const item of items) {
    const claim = claims.get(item.text);
    if (!claim) {
      failures.push(`${display}:${item.line}: checklist item has no contract claim with the same text: "${item.text}"`);
    } else if (claim.checks.length === 0) {
      failures.push(`${display}:${item.line}: claim ${claim.id} maps this checklist item to no check`);
    }
  }

  return failures;
}

function supportedLevels(manifest) {
  return Object.entries(manifest.conformance_levels)
    .filter(([, level]) => level.mechanically_checkable !== false)
    .map(([name]) => name);
}

// root resolves relative handoff and contract paths; the conformance manifest ships with Forge.
function main(argv, { root = rootDir } = {}) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const levels = supportedLevels(manifest);
  const args = parseArgs(argv, levels);

  if (args.error) {
    console.error(args.error);
    return 1;
  }

  const filePath = path.resolve(root, args.file);
  const display = displayPath(args.file, filePath, root);

  if (!fs.existsSync(filePath)) {
    console.error(`${display}: file not found`);
    return 1;
  }

  const bytes = fs.readFileSync(filePath);
  const lines = bytes.toString("utf8").split(/\r?\n/);
  const requiredSections = requiredSectionsForLevel(manifest, args.level);
  const failures = validateHc1(display, lines, requiredSections);

  if (args.level === "HC-2" || args.level === "HC-3") {
    failures.push(...validateHc2(display, lines, manifest, requiredSections));
  }

  if (args.level === "HC-3") {
    failures.push(...validateHc3(display, lines, bytes, args.contract, requiredSections, root));
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    return 1;
  }

  console.log(`handoff-conformance: ${display} conforms to ${args.level}`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, checklistItems };

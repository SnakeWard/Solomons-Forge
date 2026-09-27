#!/usr/bin/env node
"use strict";

// The forge command. Each subcommand delegates to the tool that implements it, with
// relative paths resolved against the current directory. Exit codes are the tool's own.

const path = require("node:path");

// bind and receipt report errors by throwing; keep their own prefix and exit code 2.
function guarded(prefix, run) {
  return (args) => {
    try {
      return run(args);
    } catch (error) {
      console.error(`${prefix}: ${error.message}`);
      return 2;
    }
  };
}

const COMMANDS = {
  validate: {
    usage: "forge validate HANDOFF.md [--level HC-1|HC-2|HC-3] [--contract CONTRACT_FILE]",
    summary: "check a handoff document against the handoff contract (default HC-2)",
    run: (args) => require("./validate/handoff").main(args, { root: process.cwd() }),
  },
  bind: {
    usage: "forge bind --repo PATH --contract DRAFT_FILE --out NEW_FILE",
    summary: "fill a contract draft's revision and file hashes from a clean repository",
    run: guarded("contract-bind", (args) => require("./contract/bind").main(args)),
  },
  receipt: {
    usage: "forge receipt --repo PATH --contract FILE --out NEW_DIRECTORY [--run-check ID]...",
    summary: "check received work against a bound contract and write an acceptance receipt",
    run: guarded("acceptance-receipt", (args) => require("./receipt/acceptance").main(args)),
  },
  lint: {
    usage: "forge lint terms [LEXICON_FILE] | forge lint spec [SPEC_MANIFEST]",
    summary: "check vocabulary against a lexicon, or spec structure against a spec manifest",
    run: ([kind, ...rest]) => {
      if (kind === "terms") return require("./lint/term-leak").main(rest, { root: process.cwd() });
      if (kind === "spec") return require("./lint/spec-structure").main(rest, { root: process.cwd() });
      console.error(`usage: ${COMMANDS.lint.usage}`);
      return 2;
    },
  },
};

function help() {
  const version = require("../package.json").version;
  const lines = [`forge ${version}: handoff contracts and acceptance receipts`, "", "Commands:"];
  for (const [name, command] of Object.entries(COMMANDS)) {
    lines.push(`  ${name.padEnd(9)}${command.summary}`, `           ${command.usage}`);
  }
  lines.push("", "Run verification is provided by the Key verifier; see spec/verification-interface.md.");
  return lines.join("\n");
}

function main(argv) {
  const [name, ...args] = argv;
  if (!name || name === "--help" || name === "-h" || name === "help") {
    console.log(help());
    return name ? 0 : 2;
  }
  if (name === "--version" || name === "-v") {
    console.log(require("../package.json").version);
    return 0;
  }
  const command = COMMANDS[name];
  if (!command) {
    console.error(`forge: unknown command "${name}"\n\n${help()}`);
    return 2;
  }
  return command.run(args);
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`forge: ${error.message}`);
    process.exitCode = 2;
  }
}

module.exports = { main, COMMANDS, packageRoot: path.resolve(__dirname, "..") };

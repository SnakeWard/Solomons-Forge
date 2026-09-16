"use strict";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
async function main() {
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "forge-vscode-profile-"));
const executable = process.argv[2] || await require("@vscode/test-electron").downloadAndUnzipVSCode({
  version: "1.95.3", cachePath: path.join(os.tmpdir(), "forge-vscode-runtime"),
});
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, [
  `--extensionDevelopmentPath=${path.resolve(__dirname, "..")}`,
  `--extensionTestsPath=${path.join(__dirname, "integration-suite.js")}`,
  `--user-data-dir=${path.join(profile, "user")}`,
  `--extensions-dir=${path.join(profile, "extensions")}`,
  "--disable-extensions", "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes", "--disable-gpu",
], { env, windowsHide: true, stdio: "inherit" });
child.once("error", (error) => { console.error(error); process.exitCode = 1; });
child.once("exit", (code) => { process.exitCode = code ?? 1; });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

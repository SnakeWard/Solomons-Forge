"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../../..");
const extension = path.resolve(__dirname, "..");
for (const file of ["contract/bind.js", "receipt/acceptance.js"]) {
  const target = path.join(extension, "runtime", file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, "src", file), target);
}
fs.copyFileSync(path.join(root, "LICENSE"), path.join(extension, "LICENSE"));
console.log("Forge extension runtime built from shared sources.");

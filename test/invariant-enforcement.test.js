const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(rootDir, relative), "utf8");
const map = JSON.parse(read("spec/invariant-enforcement.json"));
const conformance = JSON.parse(read("spec/handoff-conformance.json"));
const invariants = read("spec/core-invariants.md");
const verificationInterface = read("spec/verification-interface.md");

function checkExists({ kind, ref }) {
  if (kind === "test") {
    const [file, name] = ref.split("::");
    const source = read(file);
    return source.includes(`test("${name}"`) || source.includes(`test('${name}'`);
  }
  if (kind === "conformance") {
    const [level, rule] = ref.split("::");
    return Object.hasOwn(conformance.conformance_levels[level] || {}, rule);
  }
  if (kind === "key_rule") {
    return new RegExp(`\\b${ref}\\b`).test(verificationInterface);
  }
  return false;
}

test("every invariant is mapped once, and every named check exists", () => {
  const declared = [...invariants.matchAll(/^### (INV-\d+): (.+)$/gm)].map((match) => ({ id: match[1], title: match[2].trim() }));
  assert.equal(declared.length, 11);
  assert.deepEqual(map.invariants.map((entry) => entry.id), declared.map((entry) => entry.id));

  for (const entry of map.invariants) {
    const title = declared.find((item) => item.id === entry.id).title;
    assert.equal(entry.title.toLowerCase(), title.toLowerCase(), `${entry.id} title`);
    assert.ok(["enforced", "partial", "known_debt"].includes(entry.status), `${entry.id} status`);
    if (entry.status === "known_debt") {
      assert.equal(entry.checks.length, 0, `${entry.id}: known debt names no check`);
    } else {
      assert.ok(entry.checks.length > 0, `${entry.id}: ${entry.status} must name a check`);
    }
    if (entry.status !== "enforced") {
      assert.ok(typeof entry.debt === "string" && entry.debt.trim().length > 0, `${entry.id}: debt reason required`);
    }
    for (const check of entry.checks) {
      assert.ok(Object.hasOwn(map.check_kinds, check.kind), `${entry.id}: unknown check kind ${check.kind}`);
      assert.ok(typeof check.fails_when === "string" && check.fails_when.length > 0, `${entry.id}: fails_when required`);
      assert.ok(checkExists(check), `${entry.id}: named check does not exist: ${check.kind} ${check.ref}`);
    }
  }
});

test("a renamed or missing check is caught", () => {
  assert.equal(checkExists({ kind: "test", ref: "test/handoff-validate.test.js::no such test" }), false);
  assert.equal(checkExists({ kind: "conformance", ref: "HC-2::no_such_rule" }), false);
  assert.equal(checkExists({ kind: "key_rule", ref: "RUN99" }), false);
});

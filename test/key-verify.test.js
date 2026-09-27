const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  KEY_RELEASE, CI_GATES, verifyDigest, handoffDocuments, allowlistPath, parseAllowlist, runResult,
} = require("../scripts/key-verify");

const rootDir = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(rootDir, relative), "utf8");
const workflow = read(".github/workflows/ci.yml");
const spec = read("spec/verification-interface.md");
const contract = read("key/key-contract.yaml");

test("release bytes are rejected when the expected SHA-256 differs", () => {
  const bytes = Buffer.from("release");
  const good = require("node:crypto").createHash("sha256").update(bytes).digest("hex");
  assert.equal(verifyDigest(bytes, good), good);
  const altered = `${good.slice(0, -1)}${good.endsWith("0") ? "1" : "0"}`;
  assert.throws(() => verifyDigest(bytes, altered), /SHA-256 mismatch/);
});

test("a run passes only when every ci gate recorded a passing decision", () => {
  const all = Object.fromEntries(CI_GATES.map((gate) => [gate, "pass"]));
  assert.equal(runResult(all), "pass");
  assert.equal(runResult({ ...all, unit_tests_gate: "fail" }), "fail");
  const missing = { ...all };
  delete missing.term_lint_gate;
  assert.equal(runResult(missing), "fail");
  assert.equal(runResult({}), "fail");
});

test("handoff conformance covers every document CI validates, including every roadmap handoff", () => {
  const documents = handoffDocuments(workflow);
  const roadmap = fs.readdirSync(path.join(rootDir, "docs", "roadmap"))
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => `docs/roadmap/${name}`);
  for (const document of [...roadmap, "examples/example-handoff.md", "examples/review-handoff.md", "docs/handoff-template.md"]) {
    assert.ok(documents.includes(document), `${document} is not validated in CI`);
  }
  assert.throws(() => handoffDocuments("jobs: {}"), /no validate:handoff/);
});

test("pinned Key release matches the verification interface", () => {
  assert.match(spec, new RegExp(`\\| Release \\| ${KEY_RELEASE.version} \\|`));
  assert.match(spec, new RegExp(`\\| Artifact SHA-256 \\| \`${KEY_RELEASE.sha256}\` \\|`));
  assert.match(workflow, /node-version: 20\.20\.2/);
});

test("ci gates agree across the spec, the Key contract, the script, and CI step names", () => {
  const specGates = [...spec.matchAll(/\| `([a-z_]+_gate)` \| automatic \| `ci` \|/g)].map((match) => match[1]);
  assert.deepEqual(specGates, CI_GATES);

  const ciRoute = contract.split("route_id: ci")[1].split("route_id:")[0];
  assert.deepEqual([...ciRoute.matchAll(/- ([a-z_]+_gate)/g)].map((match) => match[1]), CI_GATES);

  const job = workflow.split("  key-verify:")[1];
  const named = [...job.matchAll(/- name: (.+)\n\s+run: node scripts\/key-verify\.js gate (\S+)/g)];
  assert.deepEqual(named.map((match) => match[2]), CI_GATES);
  for (const [, name, gate] of named) {
    assert.equal(`${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}_gate`, gate, `step "${name}" does not derive ${gate}`);
  }
});

test("each runner platform has an allowlist that pins only node", () => {
  for (const [platform, arch] of [["linux", "x64"], ["darwin", "arm64"], ["win32", "x64"]]) {
    const entries = parseAllowlist(fs.readFileSync(allowlistPath(platform, arch), "utf8"));
    assert.deepEqual(Object.keys(entries), ["node"], `${platform}-${arch}`);
    assert.match(entries.node, /^[a-f0-9]{64}$/);
  }
  assert.throws(() => parseAllowlist("not-a-hash  node\n"), /malformed/);
});

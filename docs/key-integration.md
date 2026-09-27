# Key Integration

Forge's own CI is verified by the Key verifier, following
[spec/verification-interface.md](../spec/verification-interface.md). The
`key-verify` job in `.github/workflows/ci.yml` runs each baseline check,
records its result with Key's adapter, and asks Key whether the run kept its
contract. It runs on Linux, macOS, and Windows, alongside the ordinary
`test` job, which still fails on its own.

## Files

| File | Purpose |
|---|---|
| `key/key-contract.yaml` | Key contract: the `ci` and `acceptance` routes and their gates (spec §3.1) |
| `key/trusted-programs-<platform>-<arch>.sha256` | Trusted-program allowlist for each CI platform. Each pins the official Node.js v20.20.2 binary. |
| `scripts/key-verify.js` | Installs the pinned Key release, records gates, writes `run.json`, verifies, and runs the drill |

## What the job proves

- Each of the five `ci` gates ran and recorded a decision, produced by the
  pinned `node` binary.
- Every decision passed, and Key reports 0 critical and 0 error findings.
- A run with one gate decision removed is rejected as a gate bypass (RUN06).
- The Key release is rejected if its SHA-256 differs from the pinned value.

Key's verification of this run reports one warning, RUN10, because no
attestation log is supplied yet.

## Reproduce locally

You need Node.js v20.20.2 as the `node` on your PATH (the allowlists pin
that exact binary), Python 3.11 or later, and a platform that has an
allowlist: linux-x64, darwin-arm64, or win32-x64.

```sh
python -m pip install PyYAML==6.0.3 jsonschema==4.26.0
export KEY_HOME=/tmp/forge-key KEY_RUN=/tmp/forge-key-run   # both outside the checkout
node scripts/key-verify.js install
node scripts/key-verify.js gate term_lint_gate
node scripts/key-verify.js gate spec_structure_gate
node scripts/key-verify.js gate handoff_conformance_gate
node scripts/key-verify.js gate unit_tests_gate
node scripts/key-verify.js gate acceptance_harness_gate
node scripts/key-verify.js verify
node scripts/key-verify.js drill
```

Use a fresh `KEY_RUN` directory for each run. The run ID is fixed the first
time a gate is recorded, and every decision must carry the same ID.

Set `PYTHON` if your interpreter is not called `python`. On Windows, use
`set` or `$env:` instead of `export`.

## Changing the pins

- **Node.js version:** download the official archive for each platform,
  check it against the release's `SHASUMS256.txt`, hash the `node` binary
  inside it, and update each allowlist and the `node-version` in the
  `key-verify` job in the same change.
- **Key release:** follow spec/verification-interface.md §4. Update the
  release constants in `scripts/key-verify.js` and the spec's pinning table
  together. `test/key-verify.test.js` fails if they disagree.
- **Gates:** step names in the `key-verify` job derive the gate IDs. The
  tests check that the step names, the contract, the script, and the spec
  agree.

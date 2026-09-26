# Forge Verification Interface

**Specification:** forge-verification-interface
**Version:** 0.1.0
**Status:** Draft
**License:** MIT

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document
are to be interpreted as described in RFC 2119.

## 1. Purpose

Forge and Key are two layers of one system. Forge states what must be built
and how a handoff is accepted. Key checks whether a recorded build kept its
contract. This document assigns each duty to one layer and defines exactly
how Forge results become Key evidence.

Forge does not implement gate decisions, an attestation log, tree pinning,
or run verification. Where the core invariants require them, this interface
supplies them through Key. Forge remains usable without Key: handoffs,
contracts, and receipts need no Key installation. Key is required only to
verify a recorded run.

This interface covers two workflows:

- **CI**: Forge's own checks run in continuous integration, and Key verifies
  that every required check ran and passed.
- **Acceptance**: a receiving actor creates a Forge acceptance receipt, the
  user decides whether to accept the work, and Key records both.

Every Key command named here is given as the script in the pinned Key
release (section 4). An installed Key distribution provides the same
commands under hyphenated names, for example `sk-adapt` for `sk_adapt.py`.

## 2. Layers and Responsibilities

| Duty | Layer | Reason |
|---|---|---|
| INV-1 Workflow before interface | Forge | Stated in the handoff's Target Outcome and Required Task Steps; construction guidance, not run evidence. |
| INV-2 Schema before surface | Forge | Construction order is a handoff concern; nothing in a run record shows it. |
| INV-3 Function before polish | Forge | Handoff Validation Checklists check function; Key sees only their results. |
| INV-4 Preservation before mutation | Both | Forge binds preserved files by hash in an acceptance contract; Key's tree pin (`sk_handoff.py`) detects that work ran against a different tree. |
| INV-5 Assumptions are labeled | Forge | Status labels are checked by the handoff validator at HC-2. |
| INV-6 Completion verification | Both | Forge receipts separate verified, disputed, and unchecked claims; Key classifies each record as computed by a program or asserted by an actor. |
| INV-7 Local simulation only where useful | Forge | The `simulated` status label is a handoff and receipt concern. |
| INV-8 Model-native adaptation | Forge | The Receiving Actor section adapts instructions to the target; there is no run evidence for it. |
| INV-9 Handoffs are self-contained | Forge | Enforced by the handoff validator (HC-1 and HC-2). |
| INV-10 Validation is mandatory | Key | Key's gate decisions and run rules fail closed on missing or failed gates; Forge supplies the evidence under section 3. |
| INV-11 Invariants are enforceable | Both | Forge's enforcement map may name a Forge check or a Key rule as the enforcing check for an invariant. |
| Gate decisions | Key | Produced by Key's adapters from Forge results (section 3). |
| Attestation log | Key | Key's append-only, hash-chained log records runs; Forge defines no log format. |
| Tree pinning | Key | Key pins a governed tree by manifest hash. |
| Run verification | Key | Key's verifier (`sk_verify.py`) compares a recorded run with its contract. It executes nothing. |
| Acceptance contracts and receipts | Forge | Defined by the Forge acceptance receipt specification. |
| Final acceptance | User | Forge never decides acceptance. Key records the user's decision as an attested gate (section 3.3). |

## 3. Evidence Mapping

### 3.1 Gates

A conforming Key contract for Forge declares these gates. Gate IDs MUST
match exactly.

| Forge check | Command | Key adapter | Gate ID | Class | Route |
|---|---|---|---|---|---|
| Term leak linter | `npm run lint:terms` | `exit-code` | `term_lint_gate` | automatic | `ci` |
| Spec structure | `npm run lint:spec` | `exit-code` | `spec_structure_gate` | automatic | `ci` |
| Handoff conformance | `npm run validate:handoff FILE`, once per document | `exit-code` | `handoff_conformance_gate` | automatic | `ci` |
| Unit tests | `node --test --test-concurrency=1 --test-reporter=junit --test-reporter-destination=FILE` | `junit` | `unit_tests_gate` | automatic | `ci` |
| Acceptance harness | `npm run test:acceptance -- --out DIR` | `exit-code` | `acceptance_harness_gate` | automatic | `ci` |
| Acceptance receipt | `node src/receipt/acceptance.js ...` | `exit-code` | `acceptance_receipt_gate` | automatic | `acceptance` |
| User acceptance | (a person) | none | `acceptance_decision_gate` | attested | `acceptance` |

The `handoff_conformance_gate` covers every handoff document the workflow
validates. Its input is the first nonzero exit code among those
validations, or 0 when all pass. The unit test suite MUST run the
extension build first (`npm run build:vscode`), as `npm test` does.

### 3.2 Automatic gates

For each automatic gate, the workflow runs the Forge check, then passes its
result to Key's adapter:

```sh
python sk_adapt.py exit-code CODE --gate GATE_ID --program node \
  --run-id RUN_ID --route ROUTE --out RUN_DIR/artifacts
python sk_adapt.py junit FILE --gate unit_tests_gate --program node \
  --run-id RUN_ID --route ci --out RUN_DIR/artifacts
```

- `CODE` MUST be the Forge process's actual exit code. Every nonzero code,
  including 2 (invalid input or operational error), produces a failing
  decision. A mapping MUST NOT translate a nonzero code to 0.
- `--program` MUST name the executable that ran the check. For every Forge
  check it is `node`, and the trusted-program allowlist pins its hash. The
  adapter hashes the executable it resolves on PATH when it runs, so the
  workflow MUST run each check with that same executable.
- A check that did not run produces no decision. The workflow MUST NOT
  write a substitute decision. Key reports the missing decision as a gate
  bypass (RUN06, critical).
- The adapter exits 1 on a failing decision. The workflow MUST continue to
  record every remaining gate, so the run is complete, and MUST fail after
  verification.

### 3.3 The attested gate

`acceptance_decision_gate` records the user's decision to accept or reject
the work after reviewing a Forge receipt. It is the only attested gate.

- Its evidence reference MUST name the `acceptance_receipt_gate` evidence
  artifact by path and SHA-256.
- Its attestation statement MUST include the SHA-256 of the `receipt.json`
  the user reviewed.
- It MUST NOT be recorded by a program on the user's behalf, and MUST NOT
  appear in a `ci` run. A decision for a gate the selected route does not
  require is an error in Key (RUN07).

### 3.4 Run manifest

Each run directory holds `run.json` with the fields Key's verifier requires
at the pinned release: `run_id`, `key_file`, `key_sha256`, `task_frame_id`,
`selected_route_id`, `actor`, and `result`. It SHOULD also name
`trusted_programs_file`.

- `result` MUST be `pass` only when every gate the route requires has a
  passing decision. Otherwise it is `fail`. A passing result with a failing
  gate is critical in Key (RUN11).
- `key_sha256` MUST be the SHA-256 of the contract file the run used.

### 3.5 Verification

```sh
python sk_verify.py RUN_DIR --key key-contract.yaml \
  --trusted TRUSTED_PROGRAMS.sha256 --schemas SCHEMA_DIR
```

`SCHEMA_DIR` MUST be the `schemas/artifacts` directory of the pinned Key
release. A run conforms only when the verifier reports 0 critical and 0
error findings. Warnings are reported, not ignored. A run without an
attestation log produces RUN10 (warning) until a log is supplied.

### 3.6 Identities

A Forge acceptance contract and a Key tree pin are separate identities, and
neither replaces the other.

- The acceptance contract binds a Git revision and the SHA-256 of each named
  file. Forge's receipt tool checks them before any selected check runs.
- Key's tree pin hashes a manifest of governed files. Key's handoff tool
  checks it.
- For the exit-code adapter, Key's input digest covers only the exit code,
  not the receipt. The link between a Key run and a specific receipt is the
  `receipt.json` SHA-256 in the attested decision's statement (section 3.3).
  Forge does not read Key's pin, and Key does not read Forge's contract.

## 4. Pinning

This interface is tested against one exact Key release:

| Field | Value |
|---|---|
| Release | v0.10.1 |
| Artifact | `solomons-key-v0.10.1.tar.gz` from the Key repository's release page |
| Artifact SHA-256 | `cb58ee272fa37816c4191a75539a2dad1752996a7be24baec3d1bc4c8d3f3ede` |
| Runtime | Python 3.11 or later, PyYAML 6.0.3, jsonschema 4.26.0 |

- A workflow MUST verify the artifact's SHA-256 before extracting it, and
  MUST stop if it differs.
- A workflow MUST NOT install Key from a branch or an unpinned version.
- Changing the pinned release requires re-running the gate trials in
  section 3 and updating this table in the same change. A new Key release
  that changes an adapter mode, gate semantics, or run manifest fields is a
  change to this interface and requires a new version of this document.

Known limits at the pinned release, recorded as dependencies on Key:

- There is no command to write `run.json` for an adapter-produced run. The
  workflow writes it under section 3.4.
- There is no command to record an attested gate decision. The workflow
  writes it in the shape Key's own tools produce for attested decisions.
- The attestation log's actor field accepts a fixed set of named actors.

## 5. Trust Boundary

This interface adds verification. It does not widen what either layer
claims.

- A Forge receipt remains an intake evidence record, not an authenticated
  statement. Recording it in Key does not make it one.
- Key's guarantees depend on its trusted-program allowlist, which MUST be
  reviewed and pinned out of band, and on an externally held log anchor.
  Read Key's trust boundary document before relying on a verified run.
- The adapter records what the named program reported. It does not prove
  that a check was meaningful or that its output is true.
- An attested decision records what a person declared. It is weaker than an
  automatic decision and is labeled as such.
- Neither layer sandboxes the checks it runs or records. See SECURITY.md.

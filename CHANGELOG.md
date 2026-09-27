# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

## [0.8.0] - 2026-09-27

- Forge's own CI is now verified by Key. A new `key-verify` job on Linux, macOS, and Windows installs Key v0.10.1 after checking its SHA-256 and records each of the five `ci` gates with Key's adapters. It writes the run manifest, lints the contract, and verifies the run with Key, failing on any critical or error finding and on any RUN17 finding.
- Added key/key-contract.yaml (derived with Key's sk_init.py from the job's step names, then split into the `ci` and `acceptance` routes) and trusted-program allowlists pinning the official Node.js v20.20.2 binary for linux-x64, darwin-arm64, and win32-x64.
- Added scripts/key-verify.js and a gate bypass drill: a run with a removed gate decision must be rejected as RUN06, and an altered release hash must be rejected.
- Added docs/key-integration.md and test/key-verify.test.js, which check that the spec, contract, script, CI step names, and allowlists agree.

## [0.7.0] - 2026-09-26

- Added the Forge verification interface specification (spec/verification-interface.md, 0.1.0 Draft). It assigns INV-1 to INV-11 and the gate, attestation log, tree pinning, and run verification duties to Forge, Key, or both. It maps each Forge check to a Key adapter and gate ID on a `ci` route and an `acceptance` route, where the user's acceptance is an attested gate. It specifies fail-closed exit-code handling, the run manifest, and verification, and pins Key v0.10.1 by tarball SHA-256. The mapping was trialled against that release before the spec was written, including a missing-gate run (critical RUN06) and an operational-error run (critical RUN11).
- Core invariants 0.2.0: §2 now names the Key verifier, through the verification interface, as the provider of gate decisions and the attestation log.
- Acceptance receipt §5 now links the verification interface instead of a future adapter (wording only; version unchanged).
- Recorded the Key gaps found during the trial as Key dependencies in the roadmap.

## [0.6.0] - 2026-09-26

- Removed the duplicate getting-started guide.
- Lexicon 1.0.5: the Key name now names the Key verifier, Forge's verification layer, instead of a reserved name. Key's name and its attestation log command name are admitted through the brand allowlist, and Forge files do not use Key's contract file suffix.
- Rewrote LINEAGE.md as a full vocabulary mapping table.
- Added SECURITY.md (private reporting to security@littlerevelationsstudio.com; the check runner is not a sandbox) and CONTRIBUTING.md.
- Added a Two layers section, credits, and contributing and security links to the README.
- Credited Pat Little as creator and Little Revelations Studio as publisher in LICENSE, package.json, and README.
- CI now runs on macOS as well as Linux and Windows. Two test fixtures now create temporary directories under the resolved temporary path, so their cleanup guard holds where the temporary directory is a symlink (as on macOS).
- Documented why the extension packaging job uses Node 22.
- Fixed receipt creation and contract binding rejecting valid repositories on Windows when the path contains 8.3 short names (for example the default temporary directory). The repository-root check now compares canonical OS paths. This had kept Windows CI red since 0.5.0.
- Added the roadmap protocol in docs/roadmap: eight HC-2 handoffs covering Forge 0.6.0 to 1.0.0, the Marketplace extension, Key 0.11.0b1, and the studio site, all validated in CI. Gate decisions and the attestation log are assigned to the Key verification layer rather than rebuilt in Forge.
- Added a VS Code extension preview with live contract diagnostics, binding, receipt inspection, and receiver-selected checks using the shared CLI engine.
- Added extension worker regression tests, an isolated VS Code host test, and VSIX packaging.
- Added a fresh-clone acceptance harness with eight scenarios, preservation comparisons, retained evidence, and CI artifact upload.
- Added acceptance receipt contract and CLI with pinned revision and file hashes.
- Added explicit check selection, captured output, and per-claim evidence status.
- Blocked execution on stale or dirty inputs; detect persistent input changes during checks.
- Added JSON and Markdown receipts that leave final acceptance to the user.
- Added regression coverage for missing evidence, failed checks, timeouts, output limits, and CLI output handling.

## [0.5.0] - 2026-07-14

First public release. Versions 0.1.0 through 0.4.0 were pre-publication build increments, published together in the repository's initial history.

- Added getting-started guide.
- Added copyable HC-2 template.
- Added second worked example for reviewer role.
- CI validates all three handoff documents.
- Added dogfooding case study; lexicon 1.0.4 excludes it as an incident record.

## [0.4.0] - Unreleased

- Added brand admission via scoped allowlist.
- Inverted linter coverage to whole-repo scan.
- Updated lexicon to 1.0.3.

## [0.3.0] - Unreleased

- Added handoff conformance validator.
- Added conformance manifest.
- Added example handoff.

## [0.2.0] - Unreleased

- Added two draft specifications.
- Added structural validator.
- Updated lexicon to 1.0.2.

## [0.1.0] - Unreleased

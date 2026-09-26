# Solomon's Forge

*Building with wisdom.*

## What

Forge is a framework for governed AI-assisted software construction: structured handoff contracts, fail-closed validation gates, and append-only attestation logging for AI-generated work.

For the evidentiary verifier that checks whether a build kept those contracts, see [Solomon's Key](https://github.com/SnakeWard/solomons-key).

## Two layers

Forge is one half of a two-repository system.

| Layer | Repository | Responsibility |
|---|---|---|
| Construction | Forge (this repository, JavaScript) | Core invariants, handoff contract, acceptance contracts and receipts, authoring tools, editor extension |
| Verification | [Key](https://github.com/SnakeWard/solomons-key) (Python) | Governance contracts, gate decisions, append-only attestation log (`sk-ledger`), run conformance, trusted-program pinning, tree pinning |

Forge states what must be built and how a handoff is accepted. Key checks
whether a recorded build kept its contract. Forge works without Key installed;
Key adds run verification.

## Status

v0.6.0, pre-release. Three draft specifications (including the [acceptance receipt](spec/acceptance-receipt.md)), three validators, contract binding, a receiver-selected check runner, and a VS Code extension preview are covered by the test suite on Linux, macOS, and Windows. Gate decisions and the append-only attestation log are provided by Key; the specification of the Forge-to-Key interface is planned for 0.7.0. The path to the joint beta and 1.0 is governed by the [roadmap protocol](docs/roadmap/README.md). For how this repository's gates caught its own author during publication, see [docs/case-study-gates.md](docs/case-study-gates.md).

## Usage

Run `npm run validate:handoff examples/example-handoff.md` to validate a handoff document.
HC-1 checks required sections and non-empty content.
HC-2 adds status-label checks for context and status declaration lists.
See `spec/handoff-contract.md` for the contract.
New here? Start with [docs/getting-started.md](docs/getting-started.md).
Copy [docs/handoff-template.md](docs/handoff-template.md) to write your own.

To check received work against a pinned commit and file hashes, use
`npm run receipt:acceptance -- --repo PATH --contract FILE --out NEW_DIRECTORY`.
Checks run only when selected with `--run-check ID`. The JSON and Markdown receipt
records verified, disputed, and unchecked claims; final acceptance remains with
the user. Start with the [acceptance receipt guide](docs/acceptance-receipt.md).

To fill a contract draft's revision and file hashes automatically, use
`npm run contract:bind -- --repo PATH --contract DRAFT_FILE --out NEW_FILE`.
The tree must be clean and the output file must be outside the repository.
Claims and commands are preserved; binding does not run checks.

The [VS Code extension](extensions/vscode/README.md) adds contract binding,
live draft validation, receipt inspection, and explicit check selection to the
editor. Build it with `npm run build:vscode`; packaging instructions are in its
README.

## Workflow tests

Run `npm run test:acceptance` for the [acceptance workflow harness](harness/acceptance/README.md).
It tests fresh receiver clones, stale inputs, and preservation regressions, and
writes receipts plus an expected-versus-actual report outside the checkout.

## Vocabulary policy

Public terminology is enforced mechanically by the term-leak linter driven by lexicon.json, so repository text and code stay aligned with the locked vocabulary.
The project brand is admitted as a scoped, versioned exception; see brand_allowlist in lexicon.json.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as
described in [SECURITY.md](SECURITY.md).

## Credits

Created by Pat Little. Published by
[Little Revelations Studio](https://littlerevelationsstudio.com).
Released under the [MIT License](LICENSE).

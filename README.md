# Solomon's Forge

*Building with wisdom.*

## What

Forge is a framework for governed AI-assisted software construction: structured handoff contracts, fail-closed validation gates, and append-only attestation logging for AI-generated work.

For the evidentiary verifier that checks whether a build kept those contracts, see [the Key repository](https://github.com/SnakeWard/solomons-key).

## Status

v0.5.0, pre-release, with an unreleased [acceptance receipt](spec/acceptance-receipt.md) implementation. Three draft specifications, three validators, and a receiver-selected check runner are covered by the test suite. Append-only attestation tooling and a general gate runner remain planned. For how this repository's gates caught its own author during publication, see [docs/case-study-gates.md](docs/case-study-gates.md).

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

## Workflow tests

Run `npm run test:acceptance` for the [acceptance workflow harness](harness/acceptance/README.md).
It tests fresh receiver clones, stale inputs, and preservation regressions, and
writes receipts plus an expected-versus-actual report outside the checkout.

## Vocabulary policy

Public terminology is enforced mechanically by the term-leak linter driven by lexicon.json, so repository text and code stay aligned with the locked vocabulary.
The project brand is admitted as a scoped, versioned exception; see brand_allowlist in lexicon.json.

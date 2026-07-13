# Solomon's Forge

*Building with wisdom.*

## What

Forge is a framework for governed AI-assisted software construction: structured handoff contracts, fail-closed validation gates, and append-only attestation logging for AI-generated work.

## Status

v0.4.0, pre-release. Two draft specifications ([core invariants](spec/core-invariants.md), [handoff contract](spec/handoff-contract.md)) and three working validators with an 11-test suite. Attestation log tooling and a gate runner are planned.

## Usage

Run `npm run validate:handoff examples/example-handoff.md` to validate a handoff document.
HC-1 checks required sections and non-empty content.
HC-2 adds status-label checks for context and status declaration lists.
See `spec/handoff-contract.md` for the contract.

## Vocabulary policy

Public terminology is enforced mechanically by the term-leak linter driven by lexicon.json, so repository text and code stay aligned with the locked vocabulary.
The project brand is admitted as a scoped, versioned exception; see brand_allowlist in lexicon.json.

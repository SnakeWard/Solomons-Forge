# Forge

## What

Forge is a framework for governed AI-assisted software construction: structured handoff contracts, fail-closed validation gates, and append-only attestation logging for AI-generated work.

## Status

Pre-release scaffold, v0.1.0. The spec and validators arrive in subsequent passes.

## Usage

Run `npm run validate:handoff examples/example-handoff.md` to validate a handoff document.
HC-1 checks required sections and non-empty content.
HC-2 adds status-label checks for context and status declaration lists.
See `spec/handoff-contract.md` for the contract.

## Vocabulary policy

Public terminology is enforced mechanically by the term-leak linter driven by lexicon.json, so repository text and code stay aligned with the locked vocabulary.

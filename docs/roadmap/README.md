# Road to 1.0

This directory is the release protocol that takes Forge from 0.5.0 to 1.0.0.
Each milestone is a Forge handoff document that conforms to HC-2. That means
this roadmap is itself governed by the framework it builds. CI validates every
handoff in this directory with `npm run validate:handoff`.

## Milestones

| Milestone | Handoff | Delivers |
|---|---|---|
| 0.6.0 | [0.6-cleanup.md](0.6-cleanup.md) | Repository hygiene, Key naming policy, extension and CI alignment |
| 0.7.0 | [0.7-gates.md](0.7-gates.md) | Gate definition specification and fail-closed gate runner |
| 0.8.0 | [0.8-attestation.md](0.8-attestation.md) | Attestation log specification and append-only tooling |
| 0.9.0 | [0.9-release-candidate.md](0.9-release-candidate.md) | HC-3, invariant enforcement map, installable CLI, spec freeze |
| 1.0.0 | [1.0-release.md](1.0-release.md) | Stable specifications, version bump, tag |

## Protocol rules

These rules apply to every milestone. A handoff may add rules but may not
relax these.

1. **Strict order.** A milestone starts only after the previous one has
   merged, and its handoff's Validation Checklist has passed on the main
   branch. Milestones are not worked in parallel.
2. **One milestone per pull request.** A pull request implements one handoff.
   It links that handoff and pastes the results of its Validation Checklist.
3. **The baseline never regresses.** Every milestone keeps these passing:
   `npm run lint:terms`, `npm run lint:spec`, `npm test`,
   `npm run test:acceptance`, and `validate:handoff` on every handoff document
   CI already validates.
4. **Fail closed.** A checklist item that was not run counts as failed. Never
   weaken, skip, or delete a test or check to reach a passing state (handoff
   contract §3.10).
5. **Record each milestone in the changelog and version.** Each milestone
   moves its entries from `[Unreleased]` into a dated `CHANGELOG.md` section,
   bumps `package.json` to the milestone version, and creates an annotated tag
   `vX.Y.0` on the merge commit. Only the maintainer creates tags.
6. **Change the scope only through this directory.** To add, drop, or move
   work between milestones, edit the handoff in the same pull request and give
   the reason. Scope added silently is a protocol violation.
7. **Status labels are truthful.** When a milestone merges, update the Status
   Declaration of the next handoff so each item carries its real label.
8. **Record known debt.** Anything deferred past 1.0 goes in the Deferred
   section below, with a reason (INV-11). Deferred items are not treated as
   done.

## Decisions locked for 1.0

These questions were settled before the roadmap started. Receiving actors
must not reopen them.

- **1.0 scope.** Handoff contract (HC-1 to HC-3), core invariants, acceptance
  receipt, gate definition, and attestation log specifications, each with a
  validator or tool, plus an installable `forge` command-line tool.
- **VS Code extension.** It keeps its own version and stays a 0.x preview.
  It does not block 1.0. It must keep building and passing its tests.
- **Key verifier.** Linking to the separate Key verifier is allowed. Building
  an adapter to its run format is not part of 1.0.
- **Dependencies.** The core package stays at zero runtime dependencies on
  Node 20 or later.
- **Publishing.** The package becomes publishable (`bin`, `files`,
  `exports`). The maintainer decides whether and when to run `npm publish`.
  No receiving actor publishes.

## Deferred past 1.0

- Adapter to the Key verifier's run format.
- Publishing the VS Code extension to a marketplace.
- Signatures on receipts and attestation entries. 1.0 provides identity
  (hashes) and ordering (hash chaining), not authentication.

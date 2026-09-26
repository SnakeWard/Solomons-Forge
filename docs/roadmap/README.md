# Road to 1.0

This directory is the release protocol that takes Forge from 0.5.0 to 1.0.0.
Each milestone is a Forge handoff document that conforms to HC-2. That means
this roadmap is itself governed by the framework it builds. CI validates every
handoff in this directory with `npm run validate:handoff`.

## Two layers

Forge is one half of a two-repository system.

| Layer | Repository | Responsibility |
|---|---|---|
| Construction | Forge (this repository, JavaScript) | Core invariants, handoff contract, acceptance contracts and receipts, authoring tools, editor extension |
| Verification | [Key](https://github.com/SnakeWard/solomons-key) (Python) | Governance contracts, gate decisions, append-only attestation log, run conformance, trusted-program pinning, tree pinning |

Forge states what must be built and how the handoff is accepted. Key
checks whether a recorded build kept its contract. Forge must not reimplement
anything Key already provides. Where the specs call for gates or an
attestation log, Forge defines the interface to Key and uses Key's
implementation.

## Milestones

| Milestone | Handoff | Delivers |
|---|---|---|
| 0.6.0 | [0.6-cleanup.md](0.6-cleanup.md) | Repository hygiene, two-layer naming policy, extension and CI alignment |
| 0.7.0 | [0.7-verification-boundary.md](0.7-verification-boundary.md) | Specification of the Forge-to-Key interface; gate and attestation duties assigned to Key |
| 0.8.0 | [0.8-key-dogfood.md](0.8-key-dogfood.md) | Forge's own CI verified by a pinned Key release |
| 0.9.0 | [0.9-release-candidate.md](0.9-release-candidate.md) | HC-3, invariant enforcement map, installable CLI, spec freeze |
| 1.0.0 | [1.0-release.md](1.0-release.md) | Stable specifications, compatibility policy, release accepted by both layers |

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
   CI already validates. Once 0.8.0 merges, Key's run verification of Forge's
   CI also joins the baseline.
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
9. **Stay in this repository.** Forge milestones do not modify Key. If a
   milestone needs a change in Key, record it under Key dependencies below
   and stop until a Key release provides it.

## Decisions locked for 1.0

These questions were settled before the roadmap started. Receiving actors
must not reopen them.

- **1.0 scope.** Handoff contract (HC-1 to HC-3), core invariants, acceptance
  receipt, and verification interface specifications, each with a validator
  or tool, plus an installable `forge` command-line tool.
- **No duplicate verifier.** Forge does not ship its own gate runner or
  attestation log. Those duties belong to Key, and Forge specifies how its
  outputs reach Key.
- **Key is pinned, not required to reach 1.0 first.** Forge 1.0 names one
  exact Key release (version and artifact SHA-256) that it is tested against.
  Forge 1.0 does not wait for Key 1.0.
- **Key stays optional for Forge users.** Handoffs, contracts, and receipts
  work without Key installed. Key is required only for Forge's own CI and
  for users who want run verification.
- **VS Code extension.** It keeps its own version and stays a 0.x preview.
  It does not block 1.0. It must keep building and passing its tests.
- **Dependencies.** The core package stays at zero runtime dependencies on
  Node 20 or later. Python and Key are CI-only dependencies.
- **Publishing.** The package becomes publishable (`bin`, `files`,
  `exports`). The maintainer decides whether and when to run `npm publish`.
  No receiving actor publishes.

## Key dependencies

These are changes Forge would like from Key. Forge milestones do not depend
on them unless a milestone says so.

- **Shared vocabulary.** Key's public text uses words that Forge's lexicon
  maps to other public terms. The two repositories should share one lexicon,
  or a documented mapping between them.
- **Native evidence for acceptance receipts.** Until Key can read a receipt
  directly, Forge passes receipt results to Key through Key's exit-code
  adapter (0.7.0 defines this mapping).

## Deferred past 1.0

- Key consuming receipt.json natively (see Key dependencies).
- Publishing the VS Code extension to a marketplace.
- Signatures on receipts. Key's trusted-program allowlist and log anchor
  remain the root of trust, as its trust boundary document describes.

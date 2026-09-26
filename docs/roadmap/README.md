# Road to the Joint Beta and 1.0

This directory is the release protocol that takes Forge from 0.5.0, through a
joint public beta with Key, to 1.0.0. Each step is a Forge handoff document
that conforms to HC-2. That means this roadmap is itself governed by the
framework it builds. CI validates every handoff in this directory with
`npm run validate:handoff`.

Created by Pat Little. Published by Little Revelations Studio
(https://littlerevelationsstudio.com).

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

## The joint beta

The beta is one coordinated release in which each part keeps its own
version number:

| Part | Beta version | Channel |
|---|---|---|
| Forge (npm package, `forge` command) | 0.9.0 | GitHub release; npm when the maintainer chooses |
| VS Code extension (one extension covering both layers) | 0.9.0, pre-release | VS Code Marketplace and Open VSX, publisher little-revelations-studio |
| Key (Python package) | 0.11.0b1 | PyPI |
| Studio site | launch | littlerevelationsstudio.com on Cloudflare Pages |

## Tracks and handoffs

| Track | Handoff | Delivers |
|---|---|---|
| Forge | [0.6-cleanup.md](0.6-cleanup.md) | Hygiene, naming, attribution, SECURITY.md, macOS CI |
| Forge | [0.7-verification-boundary.md](0.7-verification-boundary.md) | Forge-to-Key interface specification |
| Forge | [0.8-key-dogfood.md](0.8-key-dogfood.md) | Forge's own CI verified by a pinned Key release |
| Forge | [0.9-beta.md](0.9-beta.md) | HC-3, invariant map, installable CLI, joint end-to-end test, specs at Beta |
| Extension | [ext-0.9-marketplace.md](ext-0.9-marketplace.md) | Hardened extension with Key commands, published as a Marketplace pre-release |
| Key | [key-0.11-beta.md](key-0.11-beta.md) | PyPI publishing, attribution, joint test, 0.11.0b1 |
| Site | [site-studio.md](site-studio.md) | Studio site restructure with Software section and contact routing |
| Forge | [1.0-release.md](1.0-release.md) | Stable specifications after the beta period |

## Release sequence

1. Forge 0.6.0, then 0.7.0, then 0.8.0, in order.
2. In parallel with step 1: Key work up to cutting 0.11.0b1, and the site
   build up to an approved preview.
3. Key 0.11.0b1 is published to PyPI.
4. Forge 0.9.0 is released, pinned to Key 0.11.0b1.
5. The extension 0.9.0 is published as a pre-release. It depends on Forge
   0.9.0 and is tested against Key 0.11.0b1.
6. The site's Software section goes live with the compatibility table.
7. Beta period: at least one full cycle of real use and feedback. Fixes ship
   as 0.9.x, 0.11.0bN, and extension 0.9.x.
8. Forge 1.0.0 follows [1.0-release.md](1.0-release.md).

## Maintainer checklist

Only the maintainer can do these. Each handoff lists the ones it waits on.

- [ ] Create the VS Code Marketplace publisher `little-revelations-studio`
  (display name Little Revelations Studio), and store an access token with
  Marketplace Manage scope as the GitHub secret VSCE_PAT.
- [ ] Create an Open VSX namespace and store its token as OVSX_PAT.
- [ ] Add the Marketplace domain verification TXT record for
  littlerevelationsstudio.com in Cloudflare.
- [ ] Set up Cloudflare Email Routing for security@ and support@.
- [ ] Register the PyPI project and configure Key's GitHub repository as a
  trusted publisher, with a `pypi` environment that requires approval.
- [ ] Supply a 128x128 PNG icon for the extension.
- [ ] Give the Key and site work sessions write access to their repositories.
- [ ] Create every release tag.

## Protocol rules

These rules apply to every handoff. A handoff may add rules but may not
relax these.

1. **Strict order within a track.** A Forge milestone starts only after the
   previous one has merged, and its Validation Checklist has passed on the
   main branch. Tracks meet only at the points in the release sequence.
2. **One handoff per pull request.** A pull request implements one handoff.
   It links that handoff and pastes the results of its Validation Checklist.
3. **The baseline never regresses.** Every Forge milestone keeps these
   passing: `npm run lint:terms`, `npm run lint:spec`, `npm test`,
   `npm run test:acceptance`, and `validate:handoff` on every handoff
   document CI already validates. Once 0.8.0 merges, Key's run verification
   of Forge's CI also joins the baseline.
4. **Fail closed.** A checklist item that was not run counts as failed. Never
   weaken, skip, or delete a test or check to reach a passing state (handoff
   contract §3.10).
5. **Record each milestone in the changelog and version.** Each milestone
   moves its entries from `[Unreleased]` into a dated `CHANGELOG.md`
   section, bumps its version, and gets an annotated tag on the merge commit
   (`vX.Y.Z` for Forge, `ext-vX.Y.Z` for the extension). Only the maintainer
   creates tags and publishes.
6. **Change the scope only through this directory.** To add, drop, or move
   work, edit the handoff in the same pull request and give the reason.
   Scope added silently is a protocol violation.
7. **Status labels are truthful.** When a handoff merges, update the Status
   Declaration of the handoffs that depend on it so each item carries its
   real label.
8. **Record known debt.** Anything deferred goes in the Deferred section
   below, with a reason (INV-11). Deferred items are not treated as done.
9. **Each track stays in its own repository.** Forge pull requests never
   modify Key or the site, and the other way round. Cross-repository needs
   go under Key dependencies below.

## Decisions locked

These questions are settled. Receiving actors must not reopen them.

- **Names.** The studio is Little Revelations Studio, at
  littlerevelationsstudio.com. Pat Little is credited as creator in every
  license, package manifest, README, extension listing, and on the site.
- **Beta versions.** Each part keeps its own version (see the joint beta
  table). docs/compatibility.md, published in both repositories and on the
  site, links them together.
- **One extension.** A single Marketplace extension covers both layers. Key
  features appear only when Key is installed.
- **1.0 scope.** Handoff contract (HC-1 to HC-3), core invariants,
  acceptance receipt, and verification interface specifications, each with
  a validator or tool, plus an installable `forge` command-line tool.
- **No duplicate verifier.** Forge does not ship its own gate runner or
  attestation log. Those duties belong to Key.
- **Key stays optional for Forge users.** Handoffs, contracts, and receipts
  work without Key installed. Key is required only for Forge's own CI and
  for users who want run verification.
- **Dependencies.** The core npm package stays at zero runtime dependencies
  on Node 20 or later. Python and Key are CI-only dependencies of Forge.
- **Platforms.** Linux, macOS, and Windows are tested in CI for every part.

## Key dependencies

These are changes Forge needs from Key. The Key handoff covers them.

- **Shared vocabulary.** Key's public text uses words that Forge's lexicon
  maps to other public terms, including its contract file suffix. The two
  repositories agree one mapping and record it in both.
- **PyPI publishing.** Key 0.11.0b1 must be installable from PyPI before
  Forge 0.9.0 can pin it.
- **Native evidence for acceptance receipts.** Until Key can read a receipt
  directly, Forge passes receipt results to Key through Key's exit-code
  adapter (0.7.0 defines this mapping). That adapter's input digest covers
  only the exit code, so the receipt's identity travels in the attested
  decision.
- **Run manifest for adapter runs.** Key v0.10.1 has no command that writes
  run.json for a run built from adapter output, so Forge's workflow writes it.
- **Recording attested decisions.** Key v0.10.1 has no command that records
  a person's gate decision, so Forge's workflow writes it in the shape Key's
  own tools produce.
- **Attestation log actors.** The log's actor field accepts a fixed set of
  named actors.
- **Release record.** The v0.10.1 tag points at a different commit from the
  one in the v0.10.1 row of Key's RELEASES.md. The tarball's SHA-256 matches
  that row, so Forge pins the tarball rather than the tag.

## Deferred past 1.0

- Key consuming receipt.json natively (see Key dependencies).
- Signatures on receipts. Key's trusted-program allowlist and log anchor
  remain the root of trust, as its trust boundary document describes.

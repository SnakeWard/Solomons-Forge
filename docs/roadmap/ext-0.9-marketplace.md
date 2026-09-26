# Handoff: Extension 0.9.0 Marketplace Pre-release

Extension track on the road to 1.0. See docs/roadmap/README.md for the
protocol rules and the joint beta release sequence.

## Receiving Actor
- Target: AI coding agent or maintainer working in extensions/vscode of the
  Forge repository
- Why this target: the extension already has a worker, a controller, tests,
  and VSIX packaging to build on
- Expected role: Builder. Harden the extension for real user workflows and
  prepare it for publishing. Publishing itself is the maintainer's step.

## Context
- Project: the Forge VS Code extension, currently forge-contracts 0.1.0 by
  publisher SnakeWard
- Current state: contract validation, binding, receipt inspection, and
  confirmed check selection: real. Workspace trust limits: real. VSIX
  packaging in CI: real. Integration test in a real VS Code host: real, but
  not run in CI. Marketplace identity, icon, walkthrough, templates, contract
  schema, and Key commands: planned. Marketplace publisher
  little-revelations-studio: unknown (the maintainer creates it).
- Current goal: publish one extension, under the project brand, as a
  pre-release on the VS Code Marketplace and Open VSX, credited to Pat Little
  and published by Little Revelations Studio
- Build environment: Node 20 or later, @vscode/vsce, @vscode/test-electron,
  VS Code engine ^1.95.0

## Target Outcome
A VSIX at version 0.9.0 that passes the integration test in a real VS Code
host on Linux, macOS, and Windows. A tag-triggered CI job publishes it with
`--pre-release` to the Marketplace under publisher
little-revelations-studio, and to Open VSX. A new user can go from install to
a first receipt using only the walkthrough.

## Non-Negotiable Constraints
- One extension covers both layers. Key features appear only when Key is
  detected, and every Forge feature works without Python installed.
- Marketplace versions are plain major.minor.patch. Pre-release status comes
  from the `--pre-release` flag, never from a version suffix.
- No telemetry. The README says so.
- Untrusted workspaces stay limited to validation only. Running checks
  always requires explicit selection and the existing modal confirmation.
- Publishing tokens exist only as GitHub secrets. They are never in the
  repository or logs.

## Preservation Map
- Do not modify: the shared CLI engine the worker calls, receipt and contract
  formats, existing command IDs.
- Preserve: the workspace trust model, the check-selection confirmation, and
  all existing extension tests.

## Required Task Steps
1. Identity: set name, displayName (the project brand), publisher
   little-revelations-studio, `author` Pat Little, version 0.9.0, `preview`
   true, `icon` (128x128 PNG supplied by the maintainer), galleryBanner,
   `repository`, `bugs`, `homepage` https://littlerevelationsstudio.com,
   `qna`, keywords, and categories Testing and Linters. Remove
   `--allow-missing-repository`. Extend the lexicon brand allowlist to cover
   extensions/vscode/package.json and extensions/vscode/README.md.
2. Contract schema: contribute a JSON schema through `jsonValidation` for
   acceptance contracts and drafts, so users get completion and inline
   errors. Test it against every example contract.
3. Templates: add Forge: New Handoff (from docs/handoff-template.md) and
   Forge: New Contract Draft commands.
4. Walkthrough: contribute a getting-started walkthrough covering create a
   handoff, validate it, bind a contract, run checks, and read the receipt.
5. Key commands: add a `forge.keyPath` setting and detection of Key's
   commands on PATH. When Key is found, contribute Key: Lint Contract and
   Key: Verify Run, run through the same worker model with visible output.
   When Key is not found, show nothing, except a single optional hint in the
   walkthrough.
6. Errors: give clear messages with next steps when Git, Python, or Key is
   missing or has the wrong version.
7. CI: run the real-host integration test on ubuntu-latest (under xvfb),
   macos-latest, and windows-latest. Add a check on the VSIX file list so no
   test, script, or node_modules content ships.
8. Publishing: add a workflow triggered by tags matching `ext-v*` that
   packages once, then publishes that same VSIX to the Marketplace (secret
   VSCE_PAT) and Open VSX (secret OVSX_PAT) with `--pre-release`.
9. Update the extension README with a Credits section (Pat Little, creator;
   Little Revelations Studio, publisher), a privacy note, and the
   compatibility table. Update its CHANGELOG.

## Forbidden Behaviors
- Do not modify or delete failing tests or checks to achieve a passing state.
- Do not publish, create tags, or create the Marketplace publisher; the
  maintainer does these.
- Do not run any check without explicit selection and confirmation.
- Do not add telemetry, remote calls, or auto-updating of Key.

## Output Format
A single pull request with the diff, the VSIX file listing, screenshots of
the walkthrough and Key commands, and the Validation Checklist results.

## Validation Checklist
- [ ] `npx vsce ls` lists only runtime files, LICENSE, README, CHANGELOG,
  and the icon.
- [ ] The integration test passes in CI on ubuntu-latest, macos-latest, and
  windows-latest.
- [ ] Every example contract validates against the contributed schema, and a
  broken one shows inline errors.
- [ ] With Key absent, no Key command appears and every Forge command works.
- [ ] With Key 0.11.0b1 present, Key: Verify Run reports the joint workflow
  example's positive and negative runs correctly.
- [ ] A dry run of the publish workflow packages successfully without
  tokens and stops before publishing.
- [ ] `npm run lint:terms` reports 0 violations.

## Failure Recovery
If blocked: state what blocked completion, separate confirmed facts from
assumptions, leave the shared CLI engine untouched, propose the smallest
safe next step, and stop. If the maintainer has not supplied the icon or
created the publisher, finish everything else and list what is waiting.

## Status Declaration
- Validation, binding, receipts, and check selection: real
- Workspace trust limits: real
- Marketplace identity and publish workflow: planned
- Contract schema, templates, and walkthrough: planned
- Key commands: planned
- Marketplace publisher and tokens: unknown (maintainer)

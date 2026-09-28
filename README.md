# Solomon's Forge

*Building with wisdom.* Trust what your AI built, because you can check it.

> Nothing counts as done until it can be shown to be done, and a person makes the final call.

Forge is a framework for governed AI-assisted software construction. It turns an
AI's "I'm done" into evidence a person can check: structured handoffs, contracts
bound to exact files, and acceptance receipts that separate verified, disputed,
and unchecked claims. Its verification layer, [Solomon's Key](https://github.com/SnakeWard/solomons-key),
checks whether a recorded build kept its contract.

## The problem

An AI agent finishes and reports "All tests pass. Feature complete." Maybe it
did. Maybe it stubbed the hard part, rewrote code that already worked, deleted
the failing test, or described a codebase that changed an hour ago. AI writes
code faster than anyone can review it, and it sounds just as sure when it is
wrong. Confidence is not evidence.

## Two layers

Forge is one half of a two-repository system. Doing, checking, and accepting
stay separate.

| Layer | Repository | Responsibility |
|---|---|---|
| Construction | Forge (this repository, JavaScript) | Core invariants, handoff contract, acceptance contracts and receipts, the `forge` command, editor extension |
| Verification | [Key](https://github.com/SnakeWard/solomons-key) (Python) | Governance contracts, gate decisions, append-only attestation log (`sk-ledger`), run conformance, trusted-program pinning, tree pinning |
| Acceptance | You | Neither tool accepts work. Key records your decision as a human attestation. |

Forge works without Key installed; Key adds run verification. The
[verification interface](spec/verification-interface.md) assigns each duty to a
layer and maps each Forge check to a Key gate.

## How it works

1. **Write the handoff.** Work moves between AIs, sessions, or people as a
   structured [handoff](spec/handoff-contract.md) with a Preservation Map (what
   must not break), Forbidden Behaviors, and a Status Declaration that labels
   every component `real`, `simulated`, `planned`, or `unknown`.
2. **Bind it.** An acceptance contract is pinned to an exact commit and the
   SHA-256 of every file it names.
3. **Receive it.** The receiver selects which checks to run. The
   [acceptance receipt](spec/acceptance-receipt.md) marks each claim verified,
   disputed, or unchecked. Final acceptance stays with the user.
4. **Verify the run.** Key reads the build record and reports any required gate
   that left no decision as a gate bypass.

```sh
forge validate handoff.md --level HC-3 --contract contract.json
forge bind --repo . --contract draft.json --out ../contract.json
forge receipt --repo . --contract ../contract.json --out ../receipt --run-check import-tests
```

## What makes it different

- **It fails closed.** A check that did not run counts as failed. A nonzero exit
  code cannot become a pass. A missing gate decision is a critical finding.
- **It checks the handoff.** Most tools check the code. Forge checks the moment
  work changes hands, where constraints get lost and unfinished work is passed
  on as finished.
- **It publishes its limits.** Every core invariant names the check that fails
  when it is violated, or is recorded as known debt with a reason, in
  [spec/invariant-enforcement.json](spec/invariant-enforcement.json).
- **It governs itself.** This repository's roadmap is written as Forge handoffs
  that CI validates, its vocabulary is linted, and its own CI is verified by Key.

When Forge's CI first ran through Key, the Windows run recorded the unit tests
as passing while the ordinary test job failed. The cause was Key's JUnit reader,
which counted failures only on test-suite elements; Node's report has none.
Forge moved that gate to the exit code, a test now forbids the faulty path, and
the Key fix leads the Key 0.11 plan. See [Key integration](docs/key-integration.md).
For an earlier case of the gates catching their own author, see
[docs/case-study-gates.md](docs/case-study-gates.md).

## Status

v0.8.0, pre-release. The path to the joint beta and 1.0 is governed by the
[roadmap protocol](docs/roadmap/README.md). Status is declared the way Forge
declares everything:

- Specifications (handoff contract, core invariants, acceptance receipt, verification interface), drafts: real
- Handoff validator at HC-1, HC-2, and HC-3: real
- Contract binding and acceptance receipts: real
- `forge` command and installable package: real (not yet published to npm)
- CI on Linux, macOS, and Windows, verified by pinned Key v0.10.1: real
- Invariant enforcement map (5 enforced, 1 partial, 5 known debt): real
- VS Code extension: real (preview; Marketplace pre-release planned)
- Joint public beta with Key 0.11.0b1: planned
- Signed receipts: planned

Forge does not claim more than this. Hashes show that files are unchanged, not
who wrote them. The check runner is not a sandbox; review a check before you
run it (see [SECURITY.md](SECURITY.md)).

## Install and use

Forge needs Node.js 20 or later and has no runtime dependencies.

```sh
npm install              # from a clone, or install a packed tarball
npx forge --help
```

`forge validate` checks a handoff document. HC-1 checks required sections, HC-2
adds status-label checks, and HC-3 (with `--contract`) requires every Validation
Checklist item to map to a contract claim backed by a check. New here? Start with
[docs/getting-started.md](docs/getting-started.md), and copy
[docs/handoff-template.md](docs/handoff-template.md) to write your own. A worked
HC-3 pair is in [examples/](examples/).

`forge bind` fills a contract draft's revision and file hashes. The tree must be
clean and the output file must be outside the repository. Binding runs no checks.

`forge receipt` checks received work against a bound contract. Checks run only
when selected with `--run-check ID`. The JSON and Markdown receipt records
verified, disputed, and unchecked claims. Start with the
[acceptance receipt guide](docs/acceptance-receipt.md).

`forge lint terms` and `forge lint spec` check vocabulary against a lexicon and
spec structure against a spec manifest.

The npm scripts (`validate:handoff`, `contract:bind`, `receipt:acceptance`,
`lint:terms`, `lint:spec`) call the same command.

The [VS Code extension](extensions/vscode/README.md) adds contract binding, live
draft validation, receipt inspection, and explicit check selection to the editor.
Build it with `npm run build:vscode`; packaging instructions are in its README.

## Tests

`npm test` runs the unit tests. `npm run test:acceptance` runs the
[acceptance workflow harness](harness/acceptance/README.md): fresh receiver
clones, stale inputs, and preservation regressions, with receipts and an
expected-versus-actual report written outside the checkout. The `key-verify` CI
job runs the same checks through Key; see [docs/key-integration.md](docs/key-integration.md)
to reproduce it locally.

## Vocabulary policy

Public terminology is enforced by the term-leak linter driven by lexicon.json,
so repository text and code stay aligned with the locked vocabulary. The project
brand and the Key verifier's name are admitted as scoped, versioned exceptions;
see brand_allowlist in lexicon.json and [LINEAGE.md](LINEAGE.md).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as
described in [SECURITY.md](SECURITY.md).

## Credits

Created by Pat Little. Published by
[Little Revelations Studio](https://littlerevelationsstudio.com).
Forge is released under the [MIT License](LICENSE). Key is released under
Apache-2.0.

*Forge constructs. Key verifies. You decide.*

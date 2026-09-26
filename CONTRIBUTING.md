# Contributing to Forge

Forge is governed by its own rules. Contributions follow the same handoff and
validation discipline the framework asks of everyone else.

## Before you open a pull request

Run the baseline checks. Every one must pass, and none may be weakened,
skipped, or deleted to reach a passing state.

```sh
npm install
npm run lint:terms
npm run lint:spec
npm run validate:handoff examples/example-handoff.md
npm run validate:handoff examples/review-handoff.md
npm run validate:handoff docs/handoff-template.md
npm test
npm run test:acceptance
```

CI also validates every handoff in `docs/roadmap/` and runs on Linux, macOS,
and Windows.

## Changes that touch behavior need a handoff

A pull request that changes behavior (code, a specification, a JSON format,
a command-line flag, or an exit code) includes, or links to, a handoff
document that conforms to HC-2:

```sh
cp docs/handoff-template.md my-change.md
npm run validate:handoff my-change.md
```

Paste the handoff's Validation Checklist into the pull request description,
with the evidence for each item. Documentation-only fixes do not need a
handoff.

## Roadmap work

Work toward the joint beta and 1.0 follows the protocol in
[docs/roadmap/README.md](docs/roadmap/README.md): one handoff per pull
request, milestones in order, and scope changes made only by editing the
handoff with a stated reason.

## Vocabulary

Public text must use the vocabulary in `lexicon.json`. The term-leak linter
enforces it. If the linter flags your change, use the suggested public term.
Do not add exclusions to silence it.

## Commits and changelog

Add a line under `[Unreleased]` in `CHANGELOG.md` for any user-visible
change. Only the maintainer creates tags and publishes releases.

## Security

Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
MIT License in [LICENSE](LICENSE).

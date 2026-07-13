# Getting Started

This guide takes you from cloning the repository to writing and validating
your first handoff in about fifteen minutes.

## The problem this solves

When you move work between AI systems, AI sessions, or people — because a
context window ended, a token budget ran out, or a different tool is better
for the next step — the transfer is where work dies. Constraints get lost,
working code gets rewritten, and half-finished output gets inherited as
finished. A Forge handoff is a structured contract that makes the transfer
itself an inspectable, validatable artifact: the receiving actor knows its
role, what to build, what to preserve, what not to do, and how success is
judged before it writes a single line.

## Setup

Copy this repository's clone URL from the Code button on its main page,
then:

```
git clone <repository-url>
cd <repository-directory>
npm install
npm test
```

All tests should pass. Then validate the included example:

```
npm run validate:handoff examples/example-handoff.md
```

You should see: `handoff-conformance: examples/example-handoff.md conforms to HC-2`

## Your first handoff

Copy the template and fill it in:

```
cp docs/handoff-template.md my-handoff.md
```

A conforming handoff has eleven sections. Three of them do most of the work:

- **Preservation Map** — what already exists and must not be broken. This is
  the section that stops an AI from rewriting your working code. If nothing
  exists yet, say so explicitly.
- **Forbidden Behaviors** — explicit negative constraints. AI systems
  reliably exhibit failure modes that positive instructions alone do not
  prevent: expanding scope, silently redesigning, inserting placeholders,
  and deleting failing tests to reach a passing state. Name the ones that
  would hurt you.
- **Status Declaration** — every component the handoff touches, each labeled
  with one of four statuses (see below). This is what prevents the receiving
  actor from inheriting simulated work as real work.

The remaining sections are quick to fill and the template annotates each
one. The full normative definition is in
[spec/handoff-contract.md](../spec/handoff-contract.md).

## The four status labels

Every claim about system behavior carries one label:

- `real` — implemented and verified working
- `simulated` — behaves like the real feature but is a local stand-in
- `planned` — specified but not yet built
- `unknown` — status cannot currently be determined

The rule that makes these labels matter: an unlabeled claim defaults to
`unknown`, never to `real`. If you are not sure, say `unknown` — that is a
conforming answer, and it is the honest one.

## Validating

```
npm run validate:handoff my-handoff.md
```

Two conformance levels are mechanically checkable:

- **HC-1** — all eleven sections present and non-empty.
- **HC-2** — HC-1, plus status labels are used in Context and every Status
  Declaration item is labeled. This is the default.

Failures are itemized with file and line numbers. Fix, re-run, repeat until
it conforms. To check structure only: add `--level HC-1`.

## Using a handoff with an AI system

1. Write and validate the handoff.
2. Paste it as the opening message to the receiving AI (or attach the file).
3. Require the output format the handoff specifies — including the
   validation checklist results, not just the deliverable.
4. Treat the returned report as unverified until you have checked it against
   the checklist yourself. That last step is the framework; skipping it is
   how fake completion gets accepted.

For a second worked example with a reviewer role instead of a builder role,
see [examples/review-handoff.md](../examples/review-handoff.md).

## Common mistakes

- **Vague target outcome.** "Improve the module" cannot be validated. "Make
  these three tests pass without changing the public interface" can.
- **Empty preservation map on a mutation task.** A handoff that changes
  existing code without a preservation map is unsafe and should be rejected
  by the receiving actor.
- **Checklist items that cannot be checked.** Every validation item should
  map to something executable — a command, a test, an observable behavior.
- **Accepting the report without verifying it.** The receiving actor
  reporting success is a claim, not evidence. Run the checks.

## Where to go next

- [spec/handoff-contract.md](../spec/handoff-contract.md) — the normative
  contract, including conformance levels and lifecycle.
- [spec/core-invariants.md](../spec/core-invariants.md) — the eleven
  invariants the framework enforces, and why.

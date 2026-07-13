# Handoff: [Task Name]

This is a copyable template. Replace every bracketed instruction with your
content, then validate: npm run validate:handoff <your-file>.md

## Receiving Actor
- Target: [which AI system, session, or person executes this]
- Why this target: [why it is the right actor for this task]
- Expected role: [builder / reviewer / critic / implementer / architect]

## Context
- Project: [name and one-line description]
- Current state: [inventory what exists, labeling each claim: real,
  simulated, planned, or unknown — e.g. "auth flow: real, payment stub:
  simulated"]
- Current goal: [what this handoff advances]
- Build environment: [runtime, versions, dependency policy]

## Target Outcome
[What the receiving actor produces, stated specifically enough to validate.
Good: "the three failing tests in test/x.test.js pass without modifying the
public interface." Bad: "improve the module."]

## Non-Negotiable Constraints
- [Rules that must not be violated regardless of convenience: licensing,
  dependency policy, architectural boundaries, style requirements]

## Preservation Map
- Do not modify: [files, systems, and behaviors that must survive untouched]
- Preserve: [decisions and working workflows that must not be regressed.
  If nothing exists yet, say so explicitly and state what conceptual
  decisions are preserved instead.]

## Required Task Steps
1. [Concrete, ordered steps executable as written]
2. [Resolve judgment calls yourself before transfer, or delegate them
   explicitly in Receiving Actor]

## Forbidden Behaviors
- Do not modify or delete failing tests or checks to achieve a passing state.
- [Add the failure modes that would hurt this task: scope expansion, silent
  redesign, placeholder implementations, unwired UI, invented requirements]

## Output Format
[Exactly what comes back: full files, a diff, a report, a critique — plus
the validation checklist results from the section below.]

## Validation Checklist
- [ ] [Each item verifiable by the receiving actor or a mechanical check
  it runs — a command, a test, an observable behavior]
- [ ] [All previously passing checks still pass]

## Failure Recovery
If blocked: state what blocked completion, separate confirmed facts from
assumptions, preserve working systems, propose the smallest safe next step,
and stop.

## Status Declaration
Each item takes exactly one label after the colon: real, simulated,
planned, or unknown.

- [Component the handoff touches — set its true label]: unknown
- [This task's deliverable]: planned
- [Anything out of scope but adjacent]: unknown

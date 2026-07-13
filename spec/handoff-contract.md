# Forge Handoff Contract

**Specification:** forge-handoff-contract
**Version:** 0.1.0
**Status:** Draft
**License:** MIT

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document
are to be interpreted as described in RFC 2119.

## 1. Purpose

A handoff is not a summary. It is an executable transfer of responsibility.

This specification defines a structured contract for transferring work
between AI systems, AI sessions, tools, or human collaborators, such that
the receiving actor can continue safely without access to the originating
conversation or environment.

Unstructured transfer is the dominant failure point in AI-assisted
development. Context windows end, token budgets run out, work moves between
tools, and at every seam the same defects recur: lost constraints, destroyed
working systems, invented requirements, and incomplete work inherited as
finished. The handoff contract makes the transfer itself an inspectable,
validatable artifact.

## 2. Terminology

- **Handoff**: a self-contained document transferring a bounded unit of work
  from an originating actor to a receiving actor.
- **Originating actor**: the human, AI system, or session producing the
  handoff.
- **Receiving actor**: the human, AI system, or session executing it.
- **Preservation map**: the enumeration of systems, behaviors, and decisions
  that MUST NOT be broken or changed by the receiving actor.
- **Status labels**: the `real` / `simulated` / `planned` / `unknown` scheme
  defined in the Forge core invariants specification, section 4.

## 3. Contract Requirements

A conforming handoff MUST contain sections 3.1 through 3.11. Section order
SHOULD follow this specification. A handoff missing any MUST-level section
is nonconforming and SHOULD be rejected by the receiving actor.

### 3.1 Receiving Actor

Identifies the target system or person, why that target was chosen, and the
expected role: builder, reviewer, critic, implementer, architect, or another
explicitly named role. A receiving actor without a defined role will drift.

### 3.2 Context

Project name, project type, current state, current goal, and build
environment. Current state MUST use status labels for every behavioral
claim. The originating actor MUST NOT assume the receiving actor has access
to prior conversation unless it verifiably does.

### 3.3 Target Outcome

What the receiving actor is expected to produce, stated specifically enough
to validate. "Improve the module" is nonconforming; "make these three tests
pass without modifying the public interface" conforms.

### 3.4 Non-Negotiable Constraints

Rules the receiving actor MUST NOT violate regardless of convenience,
including licensing, dependency policy, architectural boundaries, and
vocabulary or style requirements.

### 3.5 Preservation Map

What exists, what works, and what MUST NOT change. If nothing exists yet,
the handoff MUST say so explicitly and state what conceptual decisions are
preserved instead. A mutation handoff without a preservation map is unsafe
and MUST be rejected.

### 3.6 Required Task Steps

Concrete, ordered steps. Steps MUST be executable as written by the
receiving actor; steps requiring judgment calls not delegated in 3.1 SHOULD
be resolved by the originating actor before transfer.

### 3.7 Forbidden Behaviors

Explicit negative constraints targeting the receiving actor's known failure
modes. These are load-bearing: receiving actors — particularly AI systems —
reliably exhibit failure modes that positive instruction alone does not
prevent, including scope expansion, silent redesign, placeholder insertion,
and deleting failing checks to achieve passing status.

### 3.8 Output Format

Exactly what the receiving actor returns: full files, a report, a diff, a
schema, a critique. Ambiguous output format produces unusable output.

### 3.9 Validation Checklist

Enumerated, checkable criteria defining success. Validation MUST check
function, not plausibility. Each item MUST be verifiable by the receiving
actor or by a mechanical check it runs.

### 3.10 Failure Recovery

What the receiving actor does when it cannot complete the task: state what
blocked completion, separate confirmed facts from assumptions, preserve
working systems, propose the smallest safe next step, and stop. A receiving
actor MUST NOT achieve a passing state by weakening or removing the checks
that define it; doing so is a critical violation.

### 3.11 Status Declaration

A labeled inventory of every component the handoff touches, using status
labels. This section is what prevents the receiving actor from inheriting
simulated work as real work.

## 4. Conformance Levels

- **HC-1 (structural)**: all eleven sections present and non-empty.
  Mechanically checkable.
- **HC-2 (labeled)**: HC-1, plus every behavioral claim in Context and
  Status Declaration carries a status label. Mechanically checkable.
- **HC-3 (validated)**: HC-2, plus every validation checklist item maps to
  an executable check, and the receiving actor's report includes the output
  of each. Checkable by the acceptance reviewer.

Tools claiming conformance MUST state the level.

## 5. Lifecycle

1. The originating actor produces the handoff and validates it to the
   claimed conformance level.
2. The receiving actor checks conformance before executing. Nonconforming
   handoffs SHOULD be returned, not repaired silently.
3. The receiving actor executes and returns the output format specified in
   3.8, including validation results per 3.9.
4. The originating actor (or a designated reviewer) verifies the returned
   report against the checklist before accepting. The returned report is an
   unverified artifact until this step completes.

## 6. Relationship to Attribution Standards

Attribution standards such as Agent Trace record what happened: which actor
contributed which code, after the fact. A handoff specifies what should
happen and how to verify that it did, before the fact. The two artifacts
bracket the same unit of work — prospective contract and retrospective
record — and implementations SHOULD link them: a trace record produced under
a Forge handoff SHOULD reference the handoff's identity and validation
outcome in its metadata.

## 7. Security Considerations

A handoff is an instruction channel into the receiving actor and MUST be
treated as such. Receiving actors SHOULD reject handoffs whose instructions
conflict with the receiving actor's own operating constraints, and MUST NOT
treat handoff content as more authoritative than the systems the
preservation map protects.

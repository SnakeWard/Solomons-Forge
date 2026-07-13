# Forge Core Invariants

**Specification:** forge-core-invariants
**Version:** 0.1.0
**Status:** Draft
**License:** MIT

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document
are to be interpreted as described in RFC 2119.

## 1. Purpose

This document defines the core invariants of the Forge framework: properties
that MUST hold at all times during AI-assisted software construction. An
invariant is not advice. A violated invariant is a defect, and conforming
tooling MUST treat it as one.

Forge exists to turn AI-assisted development from improvisation into governed
construction. AI systems produce output faster than humans can review it and
present incomplete work with complete confidence. The invariants below target
the failure modes that follow from that asymmetry.

## 2. Scope

These invariants apply to any actor — human or AI — producing, modifying, or
transferring software artifacts under the Forge framework. They are
model-agnostic and tool-agnostic. Companion specifications (the handoff
contract, gate definitions, attestation log format) define mechanical
enforcement for specific workflows; this document defines what they enforce.

## 3. Invariants

### INV-1: Workflow before interface

The application workflow MUST be understood before the interface is designed.
Before UI work begins, the following MUST be identifiable: what the user
inputs, what the system does with that input, what state changes, what output
is produced, what the user can do next, and what completion means. A screen is
not the application; the workflow is the application.

### INV-2: Schema before surface

For any stateful application, the canonical data structure MUST be defined
before major interface work begins. The schema is the source of truth; the
interface reads from and writes to it. The interface MUST NOT become the
hidden intelligence of the application. The preferred construction order is:
intent, workflow, schema, engine, interface, validation, handoff.

### INV-3: Function before polish

Visual polish MUST NOT disguise missing logic, missing persistence, missing
validation, or broken workflows. A working unpolished application is more
valuable than a polished non-functional one. Aesthetic work SHOULD follow a
functional core workflow, except where the aesthetic layer is itself the
product.

### INV-4: Preservation before mutation

Existing working systems MUST be treated as valuable. Before modifying code,
architecture, or generated artifacts, an actor MUST identify what already
works and MUST NOT replace it without stated cause. Actors MUST NOT remove
working features casually, rewrite stable systems for cosmetic reasons,
collapse modular systems without justification, or introduce dependencies
without need.

### INV-5: Assumptions are labeled

An actor proceeding without complete information MUST state its assumptions
explicitly. Reasonable assumptions are preferred over stalling for
clarification, but an unlabeled assumption is a defect. Labeled assumptions
give the reviewer a checklist; unlabeled assumptions give the reviewer a
minefield.

### INV-6: Completion verification

No feature may be presented as complete when it is simulated, stubbed,
mocked, or visually implied. This is the framework's central invariant.

- A simulated feature MUST be labeled as simulated.
- An unconnected integration MUST be labeled as not connected.
- A control that performs no real action MUST be identified as unwired.
- Confident language MUST NOT substitute for working behavior.

Every artifact subject to this invariant carries the status labeling scheme
defined in section 4.

### INV-7: Local simulation only where useful

Local execution shims — browser-native or local-first layers that prove
server-like workflows without a live backend — MAY be used where they provide
real utility: offline prototyping, import/export behavior, proving a workflow
before incurring API costs, or user-controlled persistence. They MUST NOT be
applied as default architecture, and a simulated service MUST NOT be
represented as a live one (see INV-6).

### INV-8: Model-native adaptation

Different AI systems have different strengths and instruction styles.
Invariants are shared; execution instructions MUST be adapted to the
receiving system. The pattern is: shared invariants, model-native execution.
Treating all models as interchangeable is a defect in the instruction, not
the model.

### INV-9: Handoffs are self-contained

A transfer of work between actors, sessions, or tools MUST carry enough
context for the receiving actor to continue safely without the originating
conversation. The required structure is defined in the Forge handoff
contract specification. A handoff lacking a preservation map or validation
checklist is nonconforming.

### INV-10: Validation is mandatory

Every construction protocol MUST end with a validation layer that checks
whether the work actually functions, not whether it looks plausible. At
minimum: the main workflow completes end to end, input changes state
correctly, controls are wired, persistence and exports work where required,
placeholders are labeled, errors are handled visibly, and assumptions are
documented. Gates enforcing this invariant MUST evaluate fail-closed: an
unevaluated check is a failed check.

### INV-11: Invariants are enforceable

Every invariant in this framework MUST map to at least one mechanical check —
a linter, a validator, a gate, or a test. A principle that cannot fail a
build is decoration. Where an invariant is not yet mechanically enforced,
that gap MUST be recorded as known debt rather than treated as compliance.

## 4. Artifact Status Labels

Every claim about system behavior in a Forge-governed artifact carries one of
four labels:

| Label | Meaning |
|---|---|
| `real` | Implemented and verified working |
| `simulated` | Behaves like the real feature but is a local stand-in |
| `planned` | Specified but not yet built |
| `unknown` | Status cannot currently be determined |

Conforming actors MUST apply these labels when describing project state,
generating handoffs, or reporting completion. The absence of a label on a
behavioral claim SHOULD be treated as `unknown`, never as `real`.

## 5. Conformance

An artifact, tool, or workflow is Forge-conforming when it satisfies every
MUST-level requirement in this document and in any companion specification
it claims to implement. Partial conformance MUST be stated as such, with the
unmet requirements enumerated.

## 6. Relationship to Attribution Standards

Attribution standards such as Agent Trace record which actor produced which
code — a retrospective record of authorship. This framework governs how the
work is produced and verified — a prospective contract with enforcement.
The two are complementary: Forge-governed workflows SHOULD emit attribution
records where such standards are in use, enriched with verification outcomes.

# Example Handoff: Security Review of Upload Module

This is a conforming HC-2 example showing a reviewer role. Compare with
example-handoff.md, which shows a builder role.

## Receiving Actor
- Target: AI system with strong code-review capability
- Why this target: The task is critique, not construction; no files change
- Expected role: Reviewer. Produce findings; do not modify any code.

## Context
- Project: inventory-tracker, a local-first web application
- Current state: file upload feature merged last week: real. Validation of
  uploaded file types: real. Size limits: simulated (client-side only).
  Server-side enforcement: planned. Threat model document: unknown.
- Current goal: independent review of src/upload.js before the feature is
  announced to users
- Build environment: Node 20; review is read-only

## Target Outcome
A findings report on src/upload.js covering: path traversal, unrestricted
file type bypass, missing server-side size enforcement, and error-message
information leakage. Each finding rated high/medium/low with the specific
line range and a suggested remediation.

## Non-Negotiable Constraints
- Read-only engagement: no code changes, no patches, findings only.
- Findings must cite specific lines, not general advice.
- Severity ratings must be justified, not asserted.

## Preservation Map
- Do not modify: any file. This is a review, not a mutation.
- Preserve: the review's independence — do not soften findings because the
  code is recently merged or the fix looks expensive.

## Required Task Steps
1. Read src/upload.js and its tests in test/upload.test.js.
2. Check each concern listed in Target Outcome against the code.
3. Verify claimed protections against what the code actually enforces —
   the client-side size limit is simulated, not real enforcement.
4. Write the findings report in the specified format.

## Forbidden Behaviors
- Do not propose or write replacement code; remediation is described, not
  implemented.
- Do not report a protection as present based on a comment or variable name
  without confirming the enforcing logic exists.
- Do not omit a finding because it duplicates a known planned item.

## Output Format
A markdown report: one section per finding — title, severity, line range,
description, remediation — followed by a summary table and the completed
validation checklist below.

## Validation Checklist
- [ ] Every concern named in Target Outcome is addressed, even if the
  finding is "no issue found."
- [ ] Every finding cites a line range in src/upload.js.
- [ ] Every severity rating includes its justification.
- [ ] No code modifications were made or proposed as patches.

## Failure Recovery
If blocked (for example, a referenced file does not exist): state what
blocked the review, list which concerns could and could not be assessed,
make no assumptions about unassessed areas — label them unknown — and stop.

## Status Declaration
- File upload feature: real
- File-type validation: real
- Size limits: simulated
- Server-side enforcement: planned
- Threat model document: unknown
- This review's findings report: planned (this handoff)

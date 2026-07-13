# Example Handoff: CSV Import Feature

This is a conforming HC-2 example of the Forge handoff contract. It is used
as a validator test fixture and as documentation.

## Receiving Actor
- Target: AI coding agent (any) operating in the project repository
- Why this target: The task is bounded implementation against existing tests
- Expected role: Builder. Implement exactly what is specified; do not redesign.

## Context
- Project: inventory-tracker, a local-first web application
- Current state: manual item entry works end to end: real. Export to CSV
  works: real. Import from CSV: planned. Server sync: unknown (out of scope).
- Current goal: implement CSV import matching the existing export format
- Build environment: Node 20, no new dependencies permitted

## Target Outcome
The three failing tests in test/import.test.js pass without modifying the
public interface of src/inventory.js.

## Non-Negotiable Constraints
- No new dependencies.
- The existing export format is the contract; import must round-trip it.
- All I/O errors surface to the user; no silent failures.

## Preservation Map
- Do not modify: src/export.js, the schema in src/schema.js, any passing test.
- Preserve: the existing CSV column order and header row exactly.

## Required Task Steps
1. Read test/import.test.js and src/export.js to learn the format contract.
2. Implement parseCsv and importItems in src/import.js.
3. Wire the import button in src/ui.js to importItems with visible error state.
4. Run the full test suite.

## Forbidden Behaviors
- Do not modify or delete failing tests to achieve a passing state.
- Do not add placeholder implementations that satisfy tests without real parsing.
- Do not expand scope to server sync or format changes.

## Output Format
Return: full contents of src/import.js and the src/ui.js diff, plus complete
test-suite output.

## Validation Checklist
- [ ] All tests in test/import.test.js pass.
- [ ] All previously passing tests still pass.
- [ ] A malformed CSV produces a visible error, not a crash or silent no-op.
- [ ] Export-then-import round-trips a sample inventory without data loss.

## Failure Recovery
If blocked: state what blocked completion, separate confirmed facts from
assumptions, leave src/export.js and all passing tests untouched, propose the
smallest safe next step, and stop.

## Status Declaration
- Manual item entry: real
- CSV export: real
- CSV import: planned (this handoff)
- Import button UI wiring: planned (this handoff)
- Server sync: unknown

# Forge Acceptance Receipt

**Specification:** forge-acceptance-receipt
**Version:** 1.0.0
**Status:** Draft
**License:** MIT

## 1. Purpose

A receiving actor records which declared checks it ran against a pinned handoff
and repository. The receipt distinguishes verified, disputed, and unchecked
claims before the user decides whether to accept the work.

This is an intake evidence format. It does not imply HC-1, HC-2, or HC-3
conformance, grant execution authority, or certify every statement in a handoff.

## 2. Input Contract

The UTF-8 JSON contract has exactly these fields:

- `schemaVersion`: `1.0.0`.
- `repository`: object containing `revision`, a full lowercase Git commit hash
  (40 hex characters, or 64 for a SHA-256 repository). Branch names are rejected.
- `handoff`: `{ "path": "handoff.md", "sha256": "..." }`.
- `files`: array of additional objects with the same shape as `handoff`.
- `checks`: array of `{ "id", "command", "args", "timeoutMs" }` objects.
- `claims`: nonempty array of `{ "id", "text", "checks" }` objects.

File paths use forward slashes, relative to the repository root. Absolute paths,
parent traversal, `.git` segments, duplicate paths, and paths resolving outside
the repository are rejected or disputed. Hashes bind actual file bytes, including
line endings, using SHA-256. Missing files dispute the binding.

Check and claim IDs match `[a-z][a-z0-9-]{0,63}` and are unique within their array.
Claim `checks` is an array of unique declared check IDs. An empty array means the
claim is unchecked, even when file bindings match. No natural-language inference
adds claims or infers evidence coverage. Every declared check contributes to the
overall result, including checks not referenced by a claim.

Each command is an executable name or path plus a separate array of arguments.
The working directory is the repository root. `timeoutMs` is an integer from 1
through 60000. Unknown fields and invalid references are errors, not defaults.

## 3. Execution and Binding

The receiver MUST explicitly select check IDs. With no selection the tool only
inspects input bindings. Selecting an ID authorizes that exact declared command
for this invocation; the contract itself cannot select commands.

Execution requires HEAD to match the expected revision, all bound hashes to
match, and Git status to be clean, including untracked files. A failed initial
binding blocks all checks. Output goes to a new directory outside the repository
so the receipt does not change the inspected tree. Keep an uncommitted contract
outside that tree as well.

Checks execute in declaration order, without an implicit shell, with a 1 MiB
output limit and the declared timeout. Nonzero exit, launch failure, signal,
timeout, or output overflow disputes the check. Output and execution timestamps
are recorded. An ordinary failed check does not prevent independent later checks.

The tool inspects state after each executed check and at completion. A changed
revision, dirty tree, or changed bound file disputes the binding and all claims,
disputes the check that exposed it, and blocks later commands. This detects
persistent changes at observation boundaries, not transient changes restored
before inspection.

## 4. Receipt and Status

`receipt.json` records:

- Schema version, kind, UUID, start and finish timestamps.
- SHA-256 of the input contract bytes and the parsed contract.
- Repository path, expected revision, binding result, before/after revisions,
  Git status, and expected/observed file hashes.
- Receiver-selected check IDs, Node version, and platform.
- Each declared command and its arguments, status, exit code, signal, stdout,
  stderr, execution timestamps when run, and a reason when skipped or failed.
- Claim text, referenced check IDs, status, and JSON pointers to check evidence.
- Overall status and `acceptance: "pending-user-review"`.

If binding fails, claims are disputed. Otherwise, a claim is disputed when any
referenced check is disputed, verified when its nonempty check list is entirely
verified, and unchecked otherwise. The overall result applies the same precedence
to the binding, all checks, and all claims: disputed, then unchecked, then verified.

CLI exit codes: `0` = verified evidence; `1` = disputed or unchecked evidence;
`2` = invalid input or operational error. Exit zero never means user acceptance.
Operational errors may leave an incomplete output directory; it MUST NOT be
treated as a receipt. A new run requires a fresh directory.

`receipt.md` is a readable summary of the JSON. Neither file is an independently
authenticated statement. Final acceptance remains a separate user decision.

## 5. Trust Boundary

The receiver MUST review commands and their referenced programs before selecting
them. The runner is not a sandbox: selected programs inherit the user's operating
system permissions, environment, and network access. Explicit interpreters can
execute scripts even though the runner does not implicitly use a shell. Only run
trusted, bounded checks; direct-child timeout handling does not promise process
tree containment. Windows batch wrappers are not implicitly shell-expanded.

The implementation trusts Git, the executing host, PATH resolution, the runner,
and the selected programs. It does not pin executable binaries, prove that an
exit-zero check is meaningful, or independently verify narrated stdout. Git-ignored
inputs and external dependencies are not covered by clean status; bind relevant
ignored files explicitly. Git index flags and submodule state require receiver
review. Concurrent writers and malicious programs are outside the trust boundary.

The contract digest and file hashes provide identity, not signatures. Receipts
are not append-only attestations. Deeper run verification and trusted-program
policies belong to the separate [Key verifier](https://github.com/SnakeWard/solomons-key).
This version neither invokes that verifier nor claims compatibility with its run
format. A future adapter must define and test that mapping explicitly.

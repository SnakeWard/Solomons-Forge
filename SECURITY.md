# Security Policy

## Supported versions

Forge is pre-1.0. Security fixes are made on the latest release only.

| Version | Supported |
|---|---|
| Latest 0.x release | Yes |
| Older releases | No |

## Reporting a vulnerability

Report vulnerabilities privately. Do not open a public issue.

- Email: security@littlerevelationsstudio.com
- Or use GitHub private vulnerability reporting on this repository
  (Security tab, "Report a vulnerability").

Include the affected version or commit, steps to reproduce, and the impact
you observed. You should receive an acknowledgement within seven days. Fixes
are released with a changelog entry that credits the reporter unless you ask
otherwise.

## What Forge does and does not protect against

Read this before running checks on work you did not write.

- **The check runner is not a sandbox.** Checks selected with `--run-check`,
  or in the VS Code extension, run with your operating system permissions,
  environment, and network access. Review every command, and the programs
  and scripts it references, before selecting it. See the trust boundary in
  [spec/acceptance-receipt.md](spec/acceptance-receipt.md) §5.
- **Nothing runs unless you select it.** Receipt creation and contract
  binding never execute declared commands on their own. The VS Code extension
  asks for explicit selection and confirmation, and it is limited to
  validation in untrusted workspaces.
- **Hashes are identity, not signatures.** Contract digests and file hashes
  show that inputs have not changed. They do not show who produced them.
  Receipts are not authenticated statements.
- **Handoffs are an instruction channel.** Treat handoff content as untrusted
  input to the receiving actor, as the handoff contract's security
  considerations describe.

Run verification, trusted-program pinning, and the append-only attestation
log are provided by the separate [Key verifier](https://github.com/SnakeWard/solomons-key),
which has its own trust boundary document.

# Forge Contracts for VS Code

Bind handoff contracts and create acceptance receipts from the Command Palette.
The extension bundles the same engine as the Forge CLI. Git must be available on
PATH. This version supports desktop VS Code 1.95+ with local files. Remote URI
schemes, browser workspaces, and virtual workspaces are unsupported.

## Install

Install the generated `forge-contracts-0.1.0.vsix` using **Extensions: Install from
VSIX...**, then open your project. This is a local preview, not a Marketplace
publication. The publisher field is packaging metadata, not a verified identity.

## Commands

- **Forge: Validate Contract Draft** validates the active JSON document. Problems
  also update while editing recognized contracts containing `handoff` and `claims`.
  Errors appear at the start of the document with the validator's field details.
- **Forge: Bind Contract** asks for a saved draft, repository root, and external
  output folder. It writes and opens a new JSON contract pinned to HEAD with hashes
  for the listed files. Drafts may omit revision and hash values.
- **Forge: Inspect Contract and Create Receipt** checks a saved bound contract's
  inputs without running commands. It opens the resulting Markdown summary.
- **Forge: Run Selected Checks and Create Receipt** shows check IDs, executable
  arguments, and timeouts. Nothing is selected by default. Review the selected
  commands and repository in the confirmation dialog before execution.

The repository must be committed and clean for binding and successful receipt
verification. Keep drafts and outputs outside it. Choose the actual repository
root, including in multi-root workspaces. Outputs use unique names and never
overwrite prior artifacts. Receipts include both `receipt.md` and `receipt.json`.

Unsaved contract edits must be saved first. Execution uses the exact contract
bytes reviewed in that invocation. Claims are never inferred. Every receipt keeps
`pending-user-review`; passing checks do not automatically accept work. A receipt
describes its pinned snapshot, not subsequent edits. This version does not monitor
receipt freshness or generate contract drafts.

## Trust and execution

Restricted Mode permits draft validation only. Repository operations require
Workspace Trust and check execution additionally requires explicit selection and
confirmation. Checks inherit your permissions and environment; review referenced
programs before running. Git and Node child processes run on the extension host.
The extension uses a worker thread to keep the editor responsive. One operation
runs at a time; active runs are not cancellable. Individual checks retain the
runner's declared timeout, output limits, and fail-closed binding behavior.

An operational error may leave an incomplete output directory, which must not be
treated as a receipt. Outputs can include sensitive command output; review before
sharing. Receipts are unsigned. No telemetry or network service is used by the
extension itself; selected programs may use the network.

## Development

From this directory:

```sh
npm install
npm run build
npm run package
```

The build copies the shared binder and receipt runner from the repository into
the package. Open this directory in VS Code and press F5 to launch the extension
development host. Run `npm test` from the repository root for component and worker
integration coverage. The package has no production npm dependencies.

To test activation, live diagnostics, and workers in an installed VS Code host,
run `node scripts/integration-runner.js PATH_TO_CODE_EXECUTABLE` after building.
It uses a separate temporary profile and leaves fixture receipts in the temporary
directory reported by the test. Use the actual executable, not a shell wrapper.
Omit the executable argument to download and test an isolated VS Code 1.95.3
runtime in the system temporary directory. Packaging and host-test tooling require
Node 22 or newer; the core CLI continues to support Node 20.

VS Code integration follows the official [Workspace Trust guidance](https://code.visualstudio.com/api/extension-guides/workspace-trust)
and [extension testing guidance](https://code.visualstudio.com/api/working-with-extensions/testing-extension).

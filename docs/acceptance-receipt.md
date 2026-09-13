# Check a handoff before accepting it

The acceptance receipt records what the receiver actually checked. It binds the
handoff to a commit and file hashes, runs only selected checks, and leaves final
acceptance to the user.

## Prepare a contract

Start with [the contract example](../examples/acceptance-contract.json). Replace
the all-zero revision and digests: they are intentional placeholders and will
dispute a real checkout. Use `git rev-parse HEAD` for the full commit ID. To hash
a file's exact bytes, run:

```sh
node -e "console.log(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync(process.argv[1])).digest('hex'))" path/to/file
```

Paths inside the contract are relative to the repository being received. Include
the handoff, relevant source files, and test programs in the bindings. Ensure the
receiving files use the same line endings. The tree must be clean, including
untracked files; this first version receives committed work, not an in-progress
working tree. Keep the candidate contract and receipt output outside that tree.

Write narrow claims and map each to checks that actually exercise it. For example,
“the login regression test passes” is a supported claim for that test. “All
authentication is secure” is not established by the same result.

Review commands before selecting them. Use an executable plus separate arguments;
there is no implicit shell. On Windows, prefer `node` and a script path over a
batch wrapper. Checks should not mutate source files or generate untracked output.
Selected programs run with your permissions; this is not an isolation tool.

## Inspect, then run selected checks

From the Forge checkout, with an existing parent output directory:

```sh
npm run receipt:acceptance -- --repo /path/to/received-project --contract /path/to/contract.json --out /path/to/intake-inspection
```

No declared command runs. The receipt records input matches and marks unexecuted
checks as unchecked. Exit code 1 is expected when checks remain unchecked.

After reviewing the contract, explicitly select check IDs:

```sh
npm run receipt:acceptance -- --repo /path/to/received-project --contract /path/to/contract.json --out /path/to/intake-checked --run-check login-baseline
```

Repeat `--run-check ID` to select more checks. All relative CLI paths resolve
from your current working directory. An existing output directory is refused.

Open `receipt.md` for the summary and `receipt.json` for exact commands, output,
hashes, timestamps, and per-claim evidence pointers.

| Evidence status | Meaning | Next action |
|---|---|---|
| verified | Bindings match and all declared checks and claims have passing evidence | Review check coverage and make the acceptance decision |
| disputed | A binding or executed check failed | Inspect evidence and correct or return the handoff |
| unchecked | Some claims lack executed checks | Select appropriate checks or leave the claim explicitly unresolved |

The receipt always says `pending-user-review`. It does not certify the handoff's
Markdown conformance or silently turn simulated work into real work. The existing
handoff validator can be declared as one check, with its documented limitations.

## Limits and integration

Receipts are ordinary local JSON and Markdown, not signed attestations. Captured
command output may contain sensitive project data; review it before sharing.
The deeper verifier remains a separate component, with no adapter claimed here.
See the [receipt specification](../spec/acceptance-receipt.md) for exact rules,
exit codes, and the trust boundary.

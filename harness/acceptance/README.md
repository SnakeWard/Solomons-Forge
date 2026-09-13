# Acceptance receipt workflow harness

Run from the Forge checkout:

```sh
npm run test:acceptance
```

Or retain results in a chosen new directory whose parent already exists:

```sh
npm run test:acceptance -- --out ../acceptance-results
```

Requires Node 20+ and Git. No network, model calls, or new dependencies. Output
must be outside the Forge checkout. Default output is a unique directory in the
system temporary directory. Existing directories are refused; results are retained.

The harness commits a synthetic arithmetic app in an isolated sender repository,
then makes a fresh local clone for each receiver. It invokes the actual receipt
CLI as a subprocess; it does not import the receipt's status computation. All
commits and mutations are confined to generated fixture repositories.
Git ownership exceptions apply only to those generated repositories through
subprocess environment settings; global Git configuration is unchanged.

Scenarios cover a verified baseline, inspection without execution, stale revision,
tampered handoff, missing input, a safe feature extension, a preservation
regression, and partial check selection. The negative cases pass the harness only
when the receipt reports the expected failure or uncertainty. An independent event
file records which probes actually executed, including failure cases.

The preservation experiment compares a quantity-aware total check before and after
adding a discount. The intentionally broken candidate drops quantity multiplication;
its discount check still passes. An unchanged probe digest is required for baseline
comparison. A skipped baseline check remains unchecked rather than preserved.
This is a harness experiment, not a general preservation comparison API.

Artifacts: `report.md`, `report.json`, sender and receiver repositories, per-case
contracts, receipt JSON/Markdown, invocation output and execution event logs.
The report includes source hashes, tool versions, revisions, expected/actual
results, and assertions. This is synthetic workflow coverage, not evidence that
an AI actor or a production application is correct.

Exit codes: 0 = all expectations matched; 1 = a scenario or comparison failed;
2 = harness setup/usage failure. Individual receipt exit code 1 may be expected.
The existing `npm test` suite remains the faster component/regression suite.

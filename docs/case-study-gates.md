# Case Study: The Gates Catch Their Author

Date of incidents: July 13-14, 2026 (Pass 5 of the public release build)
Status of this document: incident record. It quotes rule violations
verbatim as evidence, and is therefore excluded from the term-leak
linter's scan surface, the same mechanism used for LINEAGE.md. The
exclusion is versioned in lexicon.json.

## Background

This repository was built by a multi-model pipeline: one AI system
authored specifications and documents (judgment work), a human operator
transferred them, and a second AI system deposited them and ran
verification (mechanical work). Every deposited file was verified
byte-identical to its authored original by SHA-256. Deposits were governed
by handoff documents conforming to the contract this repository specifies,
including its Failure Recovery section (spec/handoff-contract.md, 3.10).

During Pass 5 — the pass that added the getting-started guide, the
handoff template, and a second example — the repository's own gates
rejected two of the three provided documents. Both defects were authored
by the same AI system that designed the gates.

## Incident 1: the template failed the conformance validator

The provided template's Status Declaration used an instructional
placeholder showing all four labels at once. The conformance validator
rejected it:

```
> forge-framework@0.5.0 validate:handoff
> node src/validate/handoff.js docs/handoff-template.md

docs/handoff-template.md:59: unlabeled status declaration item
```

The defective line:

```
- [Component the handoff touches]: [real / simulated / planned / unknown]
```

The HC-2 label pattern requires a single bare label after the colon or a
single bracketed label. A placeholder displaying all four options matches
neither. The validator was correct; the author's template did not conform
to the author's own specification.

The executing model's response, per the failure-recovery contract
(verbatim excerpt from its report):

> The three deposited file hashes matched their provided sources exactly,
> so the failure is in the provided template content as given. Per the
> handoff, I stopped and did not edit the template, validator, or lexicon.
> No commit or push was made.

Resolution: an authorized amendment moved the four-option instruction into
a prose line above the list, and the placeholder items took genuine
conforming labels (`unknown` and `planned` — which are also the honest
labels for placeholders). The amended template validates:

```
handoff-conformance: docs/handoff-template.md conforms to HC-2
```

Amended template SHA-256:
2093681EED5C49BBD20F8AE63517B3812B5CCE016B76AE8518286F5DFFEB10D6

## Incident 2: the guide failed the vocabulary linter

After the amended template passed, the term-leak linter rejected the
getting-started guide:

```
> forge-framework@0.5.0 lint:terms
> node src/lint/term-leak.js

docs/getting-started.md:20: pattern \bSolomon'?s?\b -> Solomon's Forge (brand, allowlisted files only) / Forge (in technical prose)
docs/getting-started.md:21: pattern \bSolomon'?s?\b -> Solomon's Forge (brand, allowlisted files only) / Forge (in technical prose)
```

The guide's setup commands contained the repository's clone URL and
directory name, which include the brand. The brand is admitted only in
three allowlisted files; docs/ is not among them.

The executing model again stopped and reported without editing anything.

Resolution: this incident forced a governance decision with two possible
fixes — widen the brand allowlist to a fourth file, or reword the guide.
The allowlist was not widened. The guide's setup section was amended to
use placeholder clone paths, since a guide living inside the repository
does not need to spell the repository's name. The boundary held; the
content changed.

## What this demonstrates

Enforcement preceded content by design: the linter was built in Pass 1,
before any document existed, so every later deposit landed on a surface
that could refuse it. Both defects here were caught before reaching public
history.

The failure-recovery protocol executed as specified, twice, under real
conditions: the receiving actor stopped, reported confirmed facts,
separated them from assumptions, proposed the smallest safe next step, and
modified nothing until authorized amendments arrived. Silent repair —
the receiving actor "helpfully" fixing the provided content — would have
masked the defects and weakened the evidence that the gates work.

The author is not exempt. The framework's central premise is that AI
output is an unverified artifact until checked. The AI system that
designed these gates shipped two nonconforming documents in a single pass.
The premise held against its own author.

## Verifying this record

The amended documents and their validation are enforced continuously: CI
validates docs/handoff-template.md and both examples at HC-2, and runs the
vocabulary linter across the repository, on every push.

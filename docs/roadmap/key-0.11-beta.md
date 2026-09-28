# Handoff: Key 0.11.0b1 Joint Beta

Key track on the road to 1.0. This handoff is kept in the Forge roadmap so
both layers' beta work is visible in one place. It is executed in the Key
repository. Copy it there when the work starts.

## Receiving Actor
- Target: AI coding agent or maintainer with write access to the Key
  repository
- Why this target: Key already has governed release tooling and a publishing
  workflow that only needs a second target
- Expected role: Implementer. Follow Key's own release rules. Where they
  conflict with this handoff, Key's rules win, and the conflict is reported.

## Context
- Project: Key, the verification layer for Forge (Python)
- Current state: released v0.10.1 and beta v0.10.2b1 on TestPyPI: real.
  VERSION file at 0.10.2b2: real. Publishing to PyPI: planned. Credit to Pat
  Little: planned (LICENSE and pyproject name only the studio). Compatibility
  table with Forge: planned. Shared vocabulary with Forge: planned.
- Current goal: release Key 0.11.0b1 on PyPI as the verification half of
  the joint beta, tested against Forge 0.9.0
- Build environment: Python 3.11 or later, PyYAML, jsonschema, Key's pinned
  release environment

## Target Outcome
`pip install solomons-key==0.11.0b1` works from PyPI on Linux, macOS, and
Windows. The release is recorded in RELEASES.md like every earlier release.
Key credits Pat Little and Little Revelations Studio, publishes the joint
compatibility table, and runs the joint end-to-end workflow in its CI.

## Non-Negotiable Constraints
- Key's release identity rules hold: one version, one immutable release set.
  Recorded versions are never re-cut.
- PyPI publishing uses trusted publishing (OIDC), with no stored API token.
- No new runtime dependencies.

## Preservation Map
- Do not modify: existing RELEASES.md rows, the trusted-program allowlist
  semantics, run and lint rule IDs, the log format.
- Preserve: the TestPyPI workflow and its recovery path.

## Required Task Steps
1. Fix the JUnit adapter so it fails closed. It must count `<failure>` and
   `<error>` elements on every `<testcase>`, including reports with no
   `<testsuite>` element such as Node's. It must also reject a report with
   no test cases. Add regression fixtures from Node's JUnit reporter, one
   passing and one failing.
2. Fix the verifier so a `--trusted` path that does not exist is an error,
   not a skipped check with a warning.
3. Attribution: add Pat Little to `authors` in pyproject.toml alongside
   Little Revelations Studio. Add a Credits section to README.md. Set the
   homepage URL to https://littlerevelationsstudio.com and keep the source
   URL pointing at GitHub.
4. Add a PyPI job to the publishing workflow for beta and release tags. It
   takes the same verified release set as TestPyPI and publishes through a
   separate `pypi` environment that requires maintainer approval.
5. Vocabulary: agree one mapping with Forge's lexicon for the words the two
   repositories use differently. Record it in both repositories.
6. Rename the CI workflow file github_workflows_solomons-key-ci.yml to
   ci.yml, and add macos-latest to its matrix.
7. Add the joint end-to-end workflow as a CI job. It installs Forge from the
   pinned 0.9.0 tag and runs the same positive and negative runs Forge
   defines in examples/joint-workflow.
8. Publish the compatibility table matching Forge's docs/compatibility.md.
9. Set VERSION to 0.11.0b1, cut the release set with Key's tooling, and
   refresh the README's pinned revision and counts.

## Forbidden Behaviors
- Do not modify or delete failing tests or checks to achieve a passing state.
- Do not edit or remove recorded release rows.
- Do not store a PyPI token in the repository or in repository secrets.
- Do not modify the Forge repository from this track.

## Output Format
A pull request in the Key repository with the diff, the new RELEASES.md row,
and the Validation Checklist results. The maintainer tags and approves the
PyPI environment.

## Validation Checklist
- [ ] Key's full test suite passes on ubuntu-latest, macos-latest, and
  windows-latest.
- [ ] Key's release acceptance gate passes for 0.11.0b1.
- [ ] After publishing, `pip install solomons-key==0.11.0b1` in a fresh
  environment provides every Key command.
- [ ] The joint workflow job passes, and its negative run fails.
- [ ] README and pyproject credit Pat Little and Little Revelations Studio.

## Failure Recovery
If blocked: state what blocked completion, separate confirmed facts from
assumptions, leave release records untouched, propose the smallest safe next
step, and stop.

## Status Declaration
- Key tools and release tooling: real
- TestPyPI beta publishing: real
- PyPI publishing: planned
- Joint workflow job in Key CI: planned
- Attribution and compatibility table: planned
- PyPI trusted publisher configuration: unknown (maintainer)

# Lineage

This document records the project's original working vocabulary and how it maps
to public terminology. The canonical mapping is lexicon.json (version
1.0.5); this table is a readable copy of it. When the two
disagree, lexicon.json wins and this file is out of date.

Lineage is culture, not interface. Nothing here is required reading to use or
evaluate Forge.

## Vocabulary mapping

| Internal term | Public term | Status |
|---|---|---|
| Solomon's Forge | Solomon's Forge (brand, allowlisted files only) / Forge (in technical prose) | brand_exception |
| Solomon's Key | Key (the Key verifier, Forge's verification layer; separate repository) | external_project |
| KEY file (Kernel Evolving YAML) | protocol manifest | translate |
| Logic Engine | governed runtime | translate |
| Hollow | sealed tool | translate |
| Hollow Server | local execution shim | translate |
| Pass | pass | keep |
| Gate | gate | keep |
| Doctrine | core invariants | translate |
| Ledger | attestation log | translate |
| L.O.T. (Logic Orchestration Table) | routing table | translate |
| Trust tiers T0-T4 | verification levels VL0-VL4 | translate |
| Verified Return Path (VRP) | Verified Return Path (VRP) | keep |
| Anti-Slop Reviewer | output review gate | translate |
| Witness (the ledger serves as the witness) | (retired — plain English) | retire |
| Judge (tests serve as the judge) | (retired — plain English) | retire |
| No fake completion | completion verification | keep_informal_translate_formal |
| real / simulated / planned / unknown labels | real / simulated / planned / unknown labels | keep |
| Handoff | handoff | keep |
| Placeholder Detector Hollow | placeholder detection tool | translate |
| Caleb / Caleb AI | (internal project name — not on public surface in v1) | internal_only |

Status meanings: `translate` terms are replaced on the public surface and
enforced by the term-leak linter; `keep` terms are already plain engineering
vocabulary; `keep_informal_translate_formal` terms stay in informal
prose but are translated in formal spec sections; `retire` terms are replaced by plain English; `brand_exception`
and `external_project` names are admitted only through the brand allowlist;
`internal_only` names stay off the public surface.

## The Key name

'Solomon's Key' was originally reserved for a future protocol manifest
language. Since lexicon 1.0.5 it is the name of the Key verifier
(https://github.com/SnakeWard/solomons-key), Forge's verification layer:
Forge states what must be built and how a handoff is accepted, and Key checks
whether a recorded build kept its contract. Both are created by Pat Little
and published by Little Revelations Studio.

Forge may link to Key and name it. The full name and Key's attestation log
command name (sk-ledger) are admitted through the brand allowlist
in the files it lists. Technical prose says "Key". Forge files do not use the
contract file suffix that Key uses for its own contracts; Forge names its Key
contract key-contract.yaml.

Key's own documentation still uses some internal terms that this lexicon
translates. Aligning the two vocabularies is tracked as a Key dependency in
docs/roadmap/README.md.

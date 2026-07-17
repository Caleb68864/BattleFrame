---
tags: [wargame-research, battletech, index]
source: inference
confidence: confirmed
---

# BattleTech — Research Index

Research into BattleTech as a candidate ruleset for **Battleframe**, a ruleset-neutral
Foundry VTT skirmish engine.

**The two headline findings:**

1. **No shippable BattleTech content exists.** Every dataset is either Topps IP or
   fan-asserted licensing over Topps IP. See [[licensing-verdict-battletech]].
2. **Hex vs inches is the architectural fault line.** Alpha Strike is inches-based and
   drops into a skirmish engine nearly free; Classic is hex-and-facing based and does not.
   See [[hex-vs-inches-is-the-fault-line]].

> [!warning] Licensing here needs a lawyer, not an agent
> The licensing notes below are structural research, **not legal advice**, and none of
> them give a green light. Whether stat blocks are uncopyrightable facts or copyrightable
> compilation is genuinely unsettled. Whether MegaMek and Flechs survive by right or by
> **tolerance** is unknown — and tolerance is not a licence.

---

## Start here

- [[licensing-verdict-battletech]] — the consolidated "can we ship BattleTech content?" answer. Verdict: no, via three independent blockers.
- [[hex-vs-inches-is-the-fault-line]] — why Alpha Strike and Classic don't share a spatial model, and what that costs the engine.
- [[engine-fit-assessment]] — Alpha Strike is an early target costing one real refactor; Classic is a late stress test, and a good one because it breaks assumptions *orthogonally*.

## Identity & IP ownership

- [[topps-owns-battletech-ip]] — who actually owns what; Microsoft holds the name for *electronic games*.
- [[unseen-harmony-gold-litigation]] — this estate litigates. Relevant to artwork especially.
- [[microsoft-game-content-usage-rules]] — the GCUR that MegaMek relies on; non-commercial and revocable at any time.
- [[catalyst-fan-content-policy-not-found]] — a negative result: no fan-content licence exists. Searched, not found.

## Licensing

- [[free-to-read-vs-free-to-ship]] — the core distinction. Free distribution is still distribution.
- [[megamek-code-license-gpl3]] — MegaMek's *code* is GPLv3. Real, but strong copyleft.
- [[megamek-data-license-cc-by-nc-sa]] — MegaMek's *data* is CC BY-NC-SA, not GPL — and the grant is likely void as to the stats (*nemo dat*). The most important note in this folder.
- [[master-unit-list-is-officially-licensed]] — the MUL runs under licence from Topps. That licence is theirs, not yours.
- [[alpha-strike-free-vs-paid-boundary]] — exactly what Catalyst gives away vs sells.
- [[battletech-official-free-downloads]] — what's officially free.

## Alpha Strike

- [[alpha-strike-mechanics]] — the ruleset's core mechanics.
- [[alpha-strike-card-anatomy]] — what's on a unit card.
- [[alpha-strike-point-value]] — PV, the force-construction currency.
- [[alpha-strike-quick-start-is-free]] — the free QSR, and what it covers.

## Classic BattleTech

All sourced from the free official *BattleTech: A Game of Armored Combat* (CAT3500D), a
legitimate subset of *Total Warfare*. No paid book was used.

- [[classic-battletech-mechanics]] — phase structure: Initiative → Movement → Weapon Attack → Physical Attack → Heat → End.
- [[classic-phase-activation-vs-unit-activation]] — **neither BattleTech is a unit-activation game.** All units move before any unit shoots.
- [[classic-heat-scale]] — 0–30 plus overflow, with four *independent, non-cumulative* threshold tracks.
- [[classic-hit-location-and-facing]] — the table has only three columns; Front and Rear share one and diverge at the armor facing, not the location roll.
- [[classic-movement-points]] — MP budgets, terrain costs; Running MP is derived (Walk × 1.5), never stored.
- [[classic-to-hit-modifiers]] — the GATOR stack; terrain modifiers double as the LOS rule.

## Force construction

- [[battle-value]] — BV, Classic's balancing currency.
- [[dictation-ambiguity-ballots-x]] — records that "ballots x" was a garbled dictation; Battle Value and MegaMekLab both covered rather than guessed between.

## Tooling & data sources

- [[megamek-what-it-is]] — the open-source BattleTech implementation.
- [[megameklab]] — the unit designer.
- [[megamek-mtf-unit-format]] — the `.mtf` 'Mech format. Machine-readable; not licensable.
- [[megamek-blk-unit-format]] — the `.blk` format for non-'Mech units.
- [[master-unit-list-api]] — the MUL's undocumented internal AJAX backend. Reachable ≠ licensed.
- [[flechs-sheets]] — the popular free online record-sheet tool.
- [[flechs-data-source-is-megamek]] — where Flechs actually gets its data, and why that matters as precedent.
- [[battletech-com-site-rebuild-2026]] — site rebuild context affecting source availability.

---

## The pattern worth carrying to the design

Flechs survives by making the **user** supply the `.mtf`. The OPR research
(`vault/opr-acquisition/`) independently reached the same conclusion — a share-link
importer, never a bundled database.

**BYO-data — the engine ships empty and the user imports — is the convergent finding
across two unrelated research tracks.** In both cases it is also the *easier* build.
That is the strongest architectural signal in this whole vault.

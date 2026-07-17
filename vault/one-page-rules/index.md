---
tags: [wargame-research, one-page-rules]
source: index
confidence: confirmed
---

# One Page Rules — Research Index

Research into **One Page Rules** (onepagerules.com) as a candidate first ruleset for the BattleFrame Foundry VTT engine. Two decisive findings up front:

> **🔴 Licensing: OPR has NO open licence.** The widely-repeated "CC BY-NC-SA 4.0" claim is **false**. The current rules are explicitly `Copyright © OPR Games. All Rights Reserved`. You **cannot** bundle rules text or army data in a module without permission.
>
> **🟢 Data: Army Forge has a working public JSON API.** Undocumented, unauthenticated, and already used by a Tabletop Simulator importer. This makes a *fetch-don't-bundle* architecture viable — and it sidesteps the licensing problem.

**Bottom line:** OPR is a strong candidate on mechanics and data, **gated on a licensing decision**. The recommended path — [[design-ship-a-rules-engine-with-no-bundled-opr-content]] — needs no permission and is the right architecture anyway. Ask OPR anyway; they look like a plausible yes.

---

## A. Licensing — read first, it's decisive

- [[licence-opr-rules-have-no-open-licence]] — **The headline finding.** Every licence surface checked; none grants anything. Default all-rights-reserved.
- [[licence-the-cc-by-nc-sa-claim-is-a-false-positive]] — The CC claim comes from **1d6chan's own wiki footer**, not OPR. Acting on it would be a costly error.
- [[licence-rules-pdf-contains-no-licence-notice]] — The current v3.5.1 PDF footer says *"Copyright © OPR Games. All Rights Reserved"*; the legacy v2.16 says nothing at all. Both mean the same thing.
- [[licence-terms-and-conditions-covers-stls-not-rules]] — OPR's only restrictive terms govern **Patreon 3D-print files**, not the rules. A scoping subtlety that cuts both ways.
- [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]] — **The direct answer to "can we redistribute?"** No — and free distribution is still distribution.
- [[licence-army-books-and-unit-stats-share-the-core-rules-status]] — Army data is **more** exposed than the rules, not less: EU database right, compilation copyright, third-party authors.
- [[licence-attribution-requirements-are-undefined]] — No attribution terms exist, because there's no licence to attribute under. Credit ≠ permission.
- [[licence-game-mechanics-are-not-copyrightable-but-text-is]] — The idea/expression split that makes an implementation survivable. *Background, not legal advice.*
- [[licence-official-github-repos-are-unlicensed-battlescribe-data]] — OPR's GitHub org is a dead end: abandoned 2022, no LICENSE, stale v2 data.
- [[licence-opr-compatibility-programme-is-for-miniature-makers]] — A real permission channel exists — aimed at STL creators, but it proves OPR says yes to people.
- [[licence-ask-opr-directly-is-the-only-clean-path]] — **The recommendation.** They give rules away free and monetise minis; a VTT module helps them. An email costs nothing.

## B. Army Forge API — the enabling discovery

- [[api-army-forge-has-an-undocumented-public-json-api]] — Working, unauthenticated endpoints found by probing. No docs, no versioning, no contract.
- [[api-tts-endpoint-schema-is-a-ready-made-import-format]] — `/api/tts` returns units, `quality`/`defense`, weapons, pre-parsed rules, base sizes, XP. Practically a VTT actor.
- [[api-the-tts-endpoint-is-precedent-for-vtt-import]] — OPR **named an endpoint after a virtual tabletop**. Strong precedent — but toleration is not a licence.
- [[api-game-system-ids-are-inconsistent-int-vs-slug]] — `gameSystem` is an int on one endpoint and a slug on another. Don't guess the mapping.

## C. Architecture recommendations

- [[design-ship-a-rules-engine-with-no-bundled-opr-content]] — **The recommended posture.** Ship the system, never the expression. Synthetic fixtures only.
- [[design-fetch-at-runtime-instead-of-bundling-sidesteps-redistribution]] — User pastes their own share link; module fetches client-side. You distribute nothing.

## D. Mechanics — turn structure

- [[mechanics-alternating-unit-activation-is-the-core-turn-structure]] — Strict alternating unit activation, **no per-round initiative roll**. Identical across five rulesets.
- [[mechanics-first-player-next-round-is-whoever-finished-activating-first]] — Round order is **inherited, not re-rolled**. One roll-off in the entire game.
- [[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]] — **⚠️ A real gap in the rules**, on your critical path. Four sources searched; zero hits. You must rule on it.
- [[mechanics-four-actions-hold-advance-rush-charge]] — The whole action economy: one mandatory action from a table of four.

## E. Mechanics — resolution

- [[mechanics-quality-and-defense-are-the-only-two-stats]] — Two numbers run the entire game. The reason OPR is a good first ruleset.
- [[mechanics-two-roll-combat-hit-then-block]] — Hit → block. **No to-wound roll**, and the *defender* rolls the save.
- [[mechanics-ap-is-a-penalty-to-the-defenders-block-roll]] — AP modifies the save, not the hit — and the 6-always-succeeds clamp means it never zeroes one out.
- [[mechanics-melee-strike-back-is-optional-and-free]] — **Reactive attacks decoupled from activation.** The rule most likely to break a naive state model.
- [[mechanics-fatigue-punishes-striking-first]] — First melee each round drops you to 6s-only. Makes strike-back a genuine decision.
- [[mechanics-morale-has-two-distinct-triggers]] — Two triggers, asymmetric outcomes. **Only melee can Rout.** The subtlest part of the core.
- [[mechanics-shaken-costs-a-full-activation-to-clear]] — Recovery costs a whole activation. "Wavering" and "Pinned" are dead v2 terms.
- [[mechanics-tough-changes-wound-allocation]] — Tough(X) replaces defender's choice with a forced priority sort. Heroes last, always.

## F. Mechanics — board, scoring, lists

- [[mechanics-measurement-is-free-and-there-are-no-facing-rules]] — Free pre-measuring is **rules-legal**; no facing; coherency is a graph connectivity check.
- [[mechanics-objectives-are-sticky-and-checked-at-end-of-round]] — Seize and leave: control persists. Scored once per round. Contesting *strips* control.
- [[mechanics-the-game-is-exactly-four-rounds-with-no-tabling-win]] — 4 rounds, hard stop. You explicitly **cannot** win by destroying the enemy army.
- [[mechanics-army-construction-is-points-based-with-optional-force-org]] — Equal points, no mandatory composition, soup legal. Army Forge already validates lists — don't reimplement.
- [[mechanics-campaign-persistence-xp-injuries-and-permadeath]] — XP, traits, injuries, permadeath, points-as-currency. **The API already carries campaign state.**
- [[mechanics-rules-versions-v2-vs-v3-differ-materially]] — **⚠️ Research trap.** Search results surface obsolete v2.16. v3 was a breaking rewrite. Target **v3.5.1**.

## G. The ruleset family

- [[family-eight-current-rulesets-in-two-version-families]] — Exactly 8 current, in a 4×2 scale×setting grid, versioned in three independent families.
- [[family-gf-and-aof-are-the-same-engine-reskinned]] — GF and Age of Fantasy are **word-for-word identical** but for two numbers and three rules.
- [[family-firefight-differs-in-damage-not-activation]] — **Not** per-model, despite being "skirmish". Swaps damage + morale scope. The real portability test.
- [[family-regiments-adds-facing-and-formations]] — Rank-and-flank. Breaks the spatial assumptions everything else shares. The hardest variant.
- [[family-quest-games-use-hero-then-ai-activation]] — Solo/co-op vs a **published deterministic AI**. Breaks alternating activation.
- [[family-warfleets-is-a-separate-engine]] — No Quality, no Defense, no AP. Shares the brand, not the engine. **Descope it.**

## H. Assessment

- [[assessment-opr-activation-vs-per-round-initiative-roll-models]] — **The GREATHELM question.** Same alternating shape; they differ in one function. Don't store `initiative` on combatants.
- [[assessment-one-engine-can-host-most-of-the-family]] — Six of eight are hostable; four are nearly one engine. But OPR is an *easy* test — Regiments is the real one.

---

## Confidence and sourcing

Every note is marked `confirmed` / `partial` / `unverified` in its frontmatter, with the specific limits stated in-body.

- **Confirmed** findings come from **official OPR PDFs fetched from their CDN and text-extracted**, or from live HTTP calls to Army Forge (July 2026).
- **Partial** findings usually rest on the **community wiki at v3.4.1** (`onepagefan.wiki`) rather than the current official PDFs — its structure is reliable, its glossary and version labels are **stale and self-contradictory**.
- **Unverified** findings are my inference or architectural judgement, labelled as such.

Where a source was silent, notes say **"not found"** rather than guessing. The main gaps: uneven-unit-count activation, objective tie-breaking, per-unit roster data, the `gameSystem` id↔slug mapping, and Army Forge subdomain terms/CORS.

**Nothing here is legal advice.** The licensing notes report what the sources say; the conclusions drawn from them are lay reading and warrant a real answer from OPR ([[licence-ask-opr-directly-is-the-only-clean-path]]).

---
tags: [wargame-research, one-page-rules]
source: inference
confidence: unverified
---

# Ship the Engine, Not the Content — the Architecture That Needs No Permission

The recommended posture for a BattleFrame OPR implementation. It resolves the licensing problem **architecturally** rather than legally, and it happens to be the better design anyway.

## The split

| BattleFrame ships (safe) | User supplies (never shipped) |
|---|---|
| Turn/activation state machine | Their own army list, via [[api-army-forge-has-an-undocumented-public-json-api]] |
| Dice resolution: hit → block | Unit names, stats, points |
| Behaviour keyed on rule **names**: `Tough`, `AP`, `Blast` | Rule **descriptions** (the prose) |
| Objective/scoring tracking | Faction names, lore, artwork |
| UI, automation, prompts | The rules PDFs (free from OPR) |

The module implements *a system*; it contains *no expression*. Per [[licence-game-mechanics-are-not-copyrightable-but-text-is]], the system side is not copyrightable subject matter, so [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]] never bites.

## Why the OPR data model makes this unusually clean

This would be painful for most games. It's easy for OPR because the API already delivers **parameterised, machine-readable rules** — `{"name":"Tough","rating":15}`, not prose ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]). So:

- The engine hard-codes `Tough` **behaviour** (wound allocation ordering — [[mechanics-tough-changes-wound-allocation]]) keyed on the string `"Tough"`.
- The **value** `15` arrives in user-supplied data.
- The **description** *"This model must take X wounds before being killed…"* is **never shipped** — the user reads OPR's free PDF.

A rule name like `"Tough"` is a **functional identifier**, not creative expression — the same reason API names have been treated as functional. (Cf. *Google v. Oracle*, 141 S. Ct. 1183 (2021), which resolved on fair use rather than copyrightability — so this is directional support, not a holding. Verify before relying on it.)

## Practical consequences

- **Don't commit fixtures.** Test data must be **synthetic** — invent "Test Unit, Q4+ D3+, Tough(3)". Never commit a real OPR army list, even to `tests/`. A committed fixture is redistribution.
- **Don't cache to disk and distribute.** Runtime cache in the user's world is fine; a cache in your repo is not.
- **Ship a rules-reference *link*, not the rules.** Point users at `onepagerules.com/resources`.
- **Avoid trademarked names in code and branding.** Call it a BattleFrame ruleset adapter, not "Grimdark Future for Foundry".

## Honest caveats

- This is **risk reduction, not immunity**. The mechanic/expression line is fuzzy ([[licence-game-mechanics-are-not-copyrightable-but-text-is]]), and a determined rightsholder can still object.
- It is **less convenient for users** — they need their own lists and their own PDFs. That's the price.
- It does **not** address whether hammering OPR's undocumented API at scale is welcome ([[design-fetch-at-runtime-instead-of-bundling-sidesteps-redistribution]]).
- Permission ([[licence-ask-opr-directly-is-the-only-clean-path]]) would let you relax several of these constraints. Pursue both.

**Confidence: unverified** — my architectural recommendation resting on legal principle I am not qualified to certify. Not legal advice.

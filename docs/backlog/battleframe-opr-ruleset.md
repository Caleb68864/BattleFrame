---
date: 2026-07-16
parent_spec: 2026-07-16-battleframe-core-mvp.md
---

# Battleframe: One Page Rules ruleset (design Phase 4)

## Context

The second ruleset. Its value is a **different turn-order source** from GREATHELM — OPR
inherits order from last round's completion order; GREATHELM re-rolls it from a dice pool.
Both are alternating activation, so this pair proves less than it appears to (see
`battleframe-alphastrike-ruleset.md`, which is the real neutrality proof).

OPR's data is unusually good: Army Forge returns fully structured JSON — `quality: 2`,
`cost: 360`, weapons as `{range, attacks, specialRules}`, and `bases: {round: "120x92"}`
for free token sizing. **No AI, no OCR, no PDF parsing is needed.**

Research: `vault/one-page-rules/` (43 notes), `vault/opr-acquisition/` (22 notes).

## ⛔ Gated — verify before building anything

**Does Army Forge have a user-facing JSON export?**

The research confirmed a fetchable **API**. It never confirmed an **export button**.
Drag-drop-a-file was chosen over the API specifically to avoid CORS — a Foundry system is
browser JS with no server, and Army Forge sends no CORS header. If no export exists, the
whole delivery mechanism must be re-decided (share-link + companion proxy, or ask OPR for
a CORS header).

**This is the cheapest task in the project and it gates everything else here. Do it first.**

## Scope

- `packages/battleframe-opr/` — module declaring `documentTypes.Actor.squad`
- Drag-drop import of exported Army Forge JSON → Actor documents, with provenance
- Alternating activation, order inherited from last round's completion order
- Quality/Defense two-roll combat (no to-wound roll; the **defender** saves)
- Target **v3.5.1**. v3 was a breaking rewrite: Pinned→**Shaken**, coherency 2"/6"→**1"/9"**,
  cover −1-to-hit→**+1 Defense**. "Wavering" does not exist in v3. Search results surface
  v2.16 — ignore them.

## Acceptance criteria

- `[STRUCTURAL]` Ships **zero** OPR rules text, stat blocks, or army data. The rules are
  `Copyright © OPR Games. All Rights Reserved` — free to read, **not** free to ship.
- `[BEHAVIORAL]` A user drops their own exported army JSON and gets Actors with correct
  Quality/Defense/cost and base sizes.
- `[STRUCTURAL]` Golden-file tests assert parsed Actors field-by-field. Points costs are
  **binary correctness** — a wrong value is a wrong game.
- `[MECHANICAL]` A schema-drift canary diffs a known list against the expected schema. OPR's
  API is undocumented and unversioned; a field rename silently corrupts costs. **Highest
  value-per-line test in the project.**
- `[BEHAVIORAL]` Unknown fields **fail loudly**. Never import a partially-understood list.
- `[STRUCTURAL]` Core required no changes to host this ruleset.

## Open question you must rule on

**What happens when players have uneven unit counts?** Unspecified across four official
documents including the Tournament Guidelines. Lists are equal *points*, not units — so this
is the **normal case**, not an edge case, and it sits on the turn engine's critical path.

## Notes

- Do **not** vendor community code: `opr-af-to-tts` has **no licence** (all rights reserved);
  `opr-card-generator` is **PolyForm Noncommercial** (MIT-incompatible). Endpoint URLs are
  facts and free to use; the code is not.
- **No Foundry OPR module exists** — checked across five surfaces. Green field.
- Worth asking OPR directly. They give rules away free, monetise miniatures, run a partner
  programme, and named an endpoint `/api/tts` after a virtual tabletop. Plausible "yes".
- Descope **Warfleets** (no Quality/Defense/AP). **Regiments** (facing/formations) is a real
  stress test, not an early target.

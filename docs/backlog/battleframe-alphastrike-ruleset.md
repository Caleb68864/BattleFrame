---
date: 2026-07-16
parent_spec: 2026-07-16-battleframe-core-mvp.md
---

# Battleframe: Alpha Strike ruleset (design Phase 4.5)

## Context

**This is the actual proof that Battleframe is ruleset-neutral.** Not GREATHELM, not OPR.

GREATHELM and OPR are both alternating-activation games — the research states they "differ
in exactly one function": where turn order comes from. Shipping both proves far less than it
appears to.

Alpha Strike is **phase-structured**: all units move before any unit shoots. There is **no
per-unit activation at all**. Even its Combat Phase doesn't alternate — the initiative loser
resolves *all* their units, then the winner. If core can host this **without changes**, the
neutrality claim is real. If it can't, core absorbed an alternating-activation bias and the
whole design failed quietly.

It's also cheap: inches-based (the MUL API literally returns `"BFMove":"6\""`), already
researched, and mechanically light.

Research: `vault/battletech/` — see `engine-fit-assessment.md`, `alpha-strike-mechanics.md`,
`hex-vs-inches-is-the-fault-line.md`.

## Scope

- `packages/battleframe-alphastrike/` — module declaring its own Actor subtype
- **Phase loop**: Initiative → Movement (all units) → Combat (all units) → End
- Deferred-effects barrier — damage applies after all attacks are declared
- Binary facing (rear attacks are +1 damage — the hex never fully leaves Alpha Strike)
- Inches-based movement through core measurement

## Acceptance criteria

- `[STRUCTURAL]` Ships **zero** Catalyst text, tables, artwork, unit names, or stat blocks.
  BYO-data only.
- `[BEHAVIORAL]` A full phase-structured round resolves: every unit moves, then every unit
  shoots.
- `[STRUCTURAL]` `combat.flags.battleframe.order` expresses a **phase**, not a unit
  activation sequence. If it can't, that's the finding — record it.
- `[MECHANICAL]` **Core required zero changes to host this.** `git diff` on
  `packages/battleframe/src/` across this work is empty.
- `[HUMAN REVIEW]` If core *did* need changes, write that up in `docs/plans/` as a design
  failure. Do not absorb it quietly.

## The point

The expected outcome is a **surprise**. The combat shell was designed against alternating
games. A phase-based game with no per-unit activation is the first thing that will genuinely
test whether "core owns no turn model" was true or just aspirational.

If this is painless, Approach C worked. If it hurts, better to learn it here — at ruleset
three — than at ruleset ten.

## Legal

Content is **not shippable**: no SRD, no OGL, no Catalyst fan-content policy (searched, not
found). Microsoft — not Catalyst — holds the BattleTech name for **electronic games**, and a
VTT module is an electronic game. MegaMek's CC BY-NC-SA data grant is likely void as to the
stats (*nemo dat* — they can't sublicense Topps IP they don't own). This estate litigates.

Mechanics are implementable; content is not. **Never ship 'Mech artwork.** Human legal
review before any public distribution.

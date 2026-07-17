---
date: 2026-07-16
parent_spec: 2026-07-16-battleframe-core-mvp.md
---

# Area service — AoE on Scene Regions (post-MeasuredTemplate)

## Context

**MeasuredTemplate Documents were deleted in Foundry v14** — the first-ever Document
removal. Every blast marker, template weapon, and flamer cone must be rebuilt on **Scene
Regions**. All pre-v14 precedent is misleading, and no precedent system has done this.

Research: `vault/foundry-systems/v14-breaking-changes-that-matter.md`.

## Why this was cut from MVP

GREATHELM's five-page QSR has Bash / Light / Heavy melee attacks and **no blast templates**.
The MVP needs no AoE at all. Building it now would be speculative work against an API nobody
has exercised, for a ruleset that doesn't want it.

Build it when a ruleset actually needs it — likely OPR (which has AP and blast weapons).

## The hard part

**Regions are persisted Documents. Templates were ephemeral.** A blast marker used to be a
throwaway preview you dragged around; now it's a database write. That difference is not a
detail — it's the whole design problem:

- Can a Region preview without persisting?
- If not, does every AoE preview round-trip the server?
- What happens to orphaned Regions if a client disconnects mid-preview?

`spike/` probe 3 was written to answer exactly this. **Read
`vault/foundry-systems/spike-results-regions.md` before designing anything here.**

## Committed default (from the design)

```
game.battleframe.areas.preview(shape) → { commit(): Promise<Region>, cancel(): void }
```

Explicit commit/cancel because the caller must decide whether to persist. Override if the
spike shows Regions can preview cheaply.

## Scope

- `packages/battleframe/src/areas/` — circles, cones, lines as Regions
- Containment queries — which tokens are inside
- Ephemeral preview over persisted Documents

## Acceptance criteria

- `[STRUCTURAL]` The service owns shapes and containment. It owns **no** blast rules and no
  AoE damage — those are ruleset logic.
- `[BEHAVIORAL]` A preview that is cancelled leaves **no** Region in the scene.
- `[BEHAVIORAL]` A client disconnecting mid-preview leaves no orphaned Region.
- `[STRUCTURAL]` Containment respects **base-to-base** geometry, not token rectangles —
  consistent with the measurement service.

---

## RESOLVED — 2026-07-17

Built in `packages/battleframe/src/areas/`, exposed as `game.battleframe.areas`.

**The spike this note demanded was never run.** It has been run now:
`vault/foundry-systems/spike-results-regions.md`. It overturned two things in this note:

1. **"MeasuredTemplate Documents were deleted in v14"** — false. Deprecated in v14, removed in
   **v16**. Direction unchanged (build on Regions), urgency wrong.
2. **The committed default `preview(shape) → {commit, cancel}`** — dropped, exactly as this
   note permitted ("override if the spike shows Regions can preview cheaply"). An **unsaved
   Region computes polygons, area, bounds and testPoint with zero persistence and zero server
   round-trip**, so the "hard part" (persisted Documents vs ephemeral templates) does not
   exist. There is no lifecycle to manage and no orphan risk.

**Containment does not use Regions at all.** `testPoint` tests a point and models are discs;
a Region circle is a 63-gon, 0.165% under-area, biased toward excluding. Containment is exact
arithmetic on the base model, consistent with `measure.between`. Regions remain the right tool
for drawing a marker (`toRegionShapes`).

**Acceptance criteria:**
- Owns shapes + containment, no blast rules — **met** (checked mechanically against code with
  comments stripped; the docblock prose mentions "blast" only to disclaim it).
- Cancelled preview leaves no Region — **met, vacuously**: nothing is ever created.
- Disconnect leaves no orphan — **met, vacuously**: same reason.
- Containment respects base-to-base geometry — **met**, and it is the reason `testPoint` was
  rejected.

**Not built:** cones and lines. Both need a geometry decision (base-overlap against an arc or
a capsule) that no current ruleset demands. GREATHELM has no templates at all; OPR blast is
circular. Build when a ruleset asks.

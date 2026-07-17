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

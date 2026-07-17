---
tags: [foundry-vtt, system-development]
source: live observation — Foundry v14.363, 2026-07-17
confidence: confirmed
---

# A Canvas Token Has No `.flags` — and Its `.width` Is a Lie

Two facts about Foundry's `Token` placeable that cost this project its core feature, both
measured live on v14.363.

## 1. Flags live on the document, not the placeable

```js
'flags' in token                          // → false
token.flags?.battleframe?.base            // → undefined
token.document.flags.battleframe.base     // → { shape:'circle', widthMm:32, heightMm:32 }
```

A `Token` on the canvas is a **PlaceableObject**, a view over its `TokenDocument`. Persisted
data — `flags`, `width`, `height`, `disposition` — lives on **`token.document`**. Reading
`token.flags` is not an error; it is `undefined`, which is worse: it silently takes a
fallback path.

## 2. `placeable.width` is PIXI bounds, not grid units

Measured on one 32mm-based token, all four at once:

| property | value | what it is |
|---|---|---|
| `placeable.width` | **9** | PIXI container bounds. **Meaningless.** |
| `placeable.height` | **32** | PIXI container bounds. **Meaningless.** |
| `placeable.w` | 125.98 | the real **pixel** width |
| `token.document.width` | 1.2598 | the real **grid-unit** width |

`Token extends PlaceableObject extends PIXI.Container`, so `.width`/`.height` are the
rendered bounding box — for a token with no art, whatever the name label happens to occupy.

**Use `token.document.width` for grid units, `token.w`/`token.h` for pixels. Never
`token.width`.**

## What this cost

Both mistakes compounded into a silent catastrophe. `getBase` read `token.flags` (undefined),
fell through to a footprint derive, which read `token.width` (**9**) and `token.height`
(**32**), and computed `max(9,32) × 25mm = 800mm` — a **400mm radius, 15.748 inches**, for a
32mm base.

Every knight became a 32-inch model. Everything overlapped everything. **Every base-to-base
distance returned 0** — the engine's entire reason to exist, wrong, with no error.

Two knights three inches apart measured zero.

## Why the tests could not catch it

All 189 passed. Every one handed `between()` a synthetic object:

```js
{ center, scene, flags: { battleframe: { base } } }   // ← top-level flags: not a real token
```

The code was written against the tests' shape rather than Foundry's, and the tests were
written from the same misunderstanding — so they agreed with each other and both were wrong.
A live probe an hour before the bug surfaced made the identical mistake and reported
measurement as "EXACT".

**A test double that does not resemble the real object in the one way that matters is worse
than no test: it manufactures confidence.** Any fixture standing in for a Foundry Token must
put `flags` on `document`, put grid units on `document.width`, and put **wrong** values on
top-level `.width`/`.height` — because that is what the real thing does, and it is the trap.

Related: [[spike-results-live-v14]], [[custom-distance-measurement-has-no-clean-override-seam]].

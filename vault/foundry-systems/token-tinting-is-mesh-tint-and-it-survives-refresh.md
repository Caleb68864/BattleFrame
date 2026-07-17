---
tags: [foundry-vtt, system-development, rendering]
source: live probe — Foundry v14.363, 2026-07-17
confidence: confirmed
---

# Token Tinting Is `mesh.tint` — and `refresh()` Destroys It

Closes a `[HUMAN REVIEW]` item that had **zero vault notes at any confidence**: the shape of
the v14 token-tinting API. Answered by controlled live experiment.

> [!danger] This note's title once ended "**and It Survives `refresh()`**". That was WRONG,
> and it was marked `confirmed`. See "The probe that lied" below. The correction is the most
> useful thing here.

## The API

```js
token.mesh.tint = 0x33cc66;   // write a NUMBER. Then STOP.
```

| probe | result |
|---|---|
| `!!token.mesh` / `'tint' in token.mesh` | `true` |
| write `0x33cc66`, read back | `3394662` ✓ |
| `'tint' in token` (the placeable itself) | **`false`** |

**Do not call `token.refresh()` after writing.** PIXI samples `mesh.tint` every frame, so the
write alone is visible immediately. A refresh is not needed and is actively harmful.

## `refresh()` clobbers the tint — the controlled experiment

Same token, same colour, one variable changed:

| | after 800ms | survives |
|---|---|---|
| write, **no** refresh | `3394662` | **yes** |
| write, **then** `refresh()` | `#ffffff` | **no** |

`refresh()` recomputes `mesh.tint` from **`document.texture.tint`** — which is `#ffffff`,
because highlighting deliberately never writes the document. So refreshing re-derives the
tint from the persisted value and wipes the ephemeral one. **A `setTint` helper that ends in
`placeable.refresh()` destroys its own write on its last line.**

## The probe that lied

The first probe wrote a tint, called `refresh()`, waited **300ms**, read it back, and saw the
tint intact → recorded `survivesRefresh: true`, `confidence: confirmed`. It is reproducibly
false at 800ms.

**v14 batches token refresh through RenderFlags and applies it on a later tick.** The window
between "refresh() returns" and "the clobber lands" is longer than 300ms. A probe that
re-reads too soon sees the tint survive and concludes the exact opposite of the truth.

**When probing anything Foundry batches, a synchronous or short-delay read-back is not
evidence.** This is the same failure that produced the `confirmed` "measurement is EXACT"
note earlier the same day: a probe that did not resemble reality in the one way that
mattered, reported with confidence. Two `confirmed` notes, both wrong, both from probes that
were too kind to themselves.

## Three more things that will bite

1. **`'tint' in placeable` is false.** Any `else if ("tint" in placeable)` fallback is **dead
   code on v14** — the tint lives on the mesh, never on the placeable.

2. **The accessor is asymmetric.** `mesh.tint` **reads** as a `Color` object
   (`typeof → "object"`, prints `#ffffff`) but **writes** accept a plain number. A test
   asserting `mesh.tint === 0xffffff` after a clear **fails** despite a correct write.

3. **This is render state, not document state.** `document.texture.tint` stays `#ffffff`
   throughout. Tinting the mesh is ephemeral and client-local — exactly right for "highlight
   legal targets while a die is selected", and the reason a probe reading
   `document.texture.tint` sees nothing change **even when tinting works perfectly**. That
   false negative cost real time here: it cannot distinguish "tinting is broken" from
   "tinting writes somewhere else". **Verify mesh tinting by reading `mesh.tint`.**

## Why this note exists

The implementation guessed `mesh.tint` correctly and shipped it **unreachable** — nothing
imported the module, so `applyHighlights` was tree-shaken out of the bundle and the feature
was dead on arrival. Once wired, it was *still* dead, because `setTint` ended in the
`refresh()` that undid it. Two independent defects, same symptom, zero errors in the console.

Related: [[real-tokens-keep-their-flags-on-the-document]], [[spike-results-live-v14]].

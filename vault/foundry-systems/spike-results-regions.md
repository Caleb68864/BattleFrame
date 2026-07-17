---
tags: [foundry-vtt, system-development, spike-results, areas]
source: live probe — Foundry v14.363 at foundry.savagefables.com, 2026-07-17
confidence: confirmed
---

# Regions Spike — The Design Problem Dissolves

**The file `docs/backlog/battleframe-area-service-regions.md` said "read this before designing
anything here." It did not exist.** The prerequisite was never run. This is it.

Every open question in that backlog note is answered below, and the answers **overturn its
committed default**.

## Correction: MeasuredTemplates are NOT gone

The vault said [[v14-breaking-changes-that-matter|"MeasuredTemplate Documents are GONE — the
first-ever Document removal"]]. On live v14.363 they are **all still there**:
`MeasuredTemplateDocument`, `TemplateLayer`, `canvas.scene.templates`,
`CONST.MEASURED_TEMPLATE_TYPES` (circle/cone/rect/ray) — and a template **constructs
successfully**. What actually happens is a deprecation warning:

```
MeasuredTemplateDocument is deprecated because it has been merged into
the functionality of the Region document.
Deprecated since Version 14
Backwards-compatible support will be removed in Version 16
```

**Deprecated in v14, removed in v16.** The direction was right — build on Regions — but the
framing was wrong, and the difference matters: this is a two-major-version runway, not an
emergency. Anything written against MeasuredTemplate works today and dies in v16.

`Scene#templates` warns too, with a delicious inconsistency: it reports *"deprecated because
the MeasuredTemplate document has been merged into the Region document"* in one path and
*"deprecated without replacement"* in another.

## The load-bearing answer: an unsaved Region is fully functional

The backlog's whole design problem was **"Regions are persisted Documents, templates were
ephemeral"** — and therefore: can a Region preview without persisting? does every preview
round-trip the server? what about orphans on disconnect?

```js
const doc = new CONFIG.Region.documentClass(
  { name: 'preview', shapes: [{ type: 'circle', x: 1000, y: 1000, radius: 200 }] },
  { parent: canvas.scene }
);
```

| probe | result |
|---|---|
| `polygons` / `area` / `bounds` | all computed |
| `testPoint` centre / inside / outside | `true` / `true` / **`false`** |
| `doc.id` | **`null`** |
| `canvas.scene.regions.size` after | **0 — nothing persisted** |

**A Region previews, measures, and answers containment with zero persistence and zero server
round-trip.** All three questions dissolve at once:

- *Can a Region preview without persisting?* — **Yes.**
- *Does every AoE preview round-trip the server?* — **No.**
- *Orphaned Regions if a client disconnects mid-preview?* — **Impossible.** Nothing is written
  unless you explicitly call `create`.

### So the committed default was wrong

The backlog committed to `areas.preview(shape) → { commit(), cancel() }`, and said to
*"override if the spike shows Regions can preview cheaply."* It does. **The commit/cancel
ceremony existed only to manage a persistence problem that does not exist.** There is no
lifecycle to manage: construct geometry, ask it questions, drop it on the floor.

## But containment should not use Regions at all

Regions can answer containment. They are still the wrong tool, for two reasons:

**1. `testPoint` tests a point. Models are discs.** A knight whose base is half under a blast
but whose centre is not would read "not hit" — wrong in every miniatures game researched, and
directly contrary to the backlog's own AC (*"containment respects base-to-base geometry, not
token rectangles"*).

**2. A Region circle is a 63-vertex inscribed polygon.**

| | |
|---|---|
| `area` for r=200 | 125,456.39 |
| true `πr²` | 125,663.71 |
| error | **−0.165%**, always *under* |
| point at exactly the true radius | **`false`** |

The polygon inscribes the circle, so the error is small but **systematically biased toward
excluding**. "Is this model under the blast" is binary and contested.

**Conclusion: compute containment yourself, exactly, on the base model — the same conclusion
[[custom-distance-measurement-has-no-clean-override-seam|measurement]] reached.** Regions stay
the right tool for *drawing* a marker. Shapes verified constructible: `circle`, `ellipse`,
`rectangle`, `polygon`.

## The boundary is not decidable, and that is a fact about floats

`(3 + r) * 20` and `3 * 20 + r * 20` differ by **1.42e-14** — IEEE-754 does not distribute. So
**there is no coordinate a caller can construct that is provably ON the blast edge**; at that
scale the answer depends on which expression built the number, not on geometry.

This is the blast twin of the base-contact `=== 0` bug (Foundry stores token x/y as integers,
so a "touching" gap was 0.00015" and never `=== 0`). A ruleset needing "exactly touching" must
define a **tolerance in rules units**. `areas.contains` therefore promises only: resolves
correctly either side of the boundary, and makes no exact-touch guarantee.

Related: [[real-tokens-keep-their-flags-on-the-document]], [[spike-results-live-v14]],
[[token-tinting-is-mesh-tint-and-it-survives-refresh]].

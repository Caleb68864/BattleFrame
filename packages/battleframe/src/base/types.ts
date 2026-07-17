export type BaseShape = "circle" | "oval";

export interface BaseDimensions {
  shape: BaseShape;
  widthMm: number;
  heightMm: number;
}

export interface BattleframeTokenFlags {
  base?: BaseDimensions;
}

export interface TokenFlagsLike {
  battleframe?: BattleframeTokenFlags;
}

/**
 * The subset of a Foundry `TokenDocument` this system reads.
 *
 * This is where a token's truth lives. A canvas `Token` placeable is a PIXI
 * container that *wraps* a document; the document is the only place that
 * carries flags and a footprint expressed in grid units.
 */
export interface TokenDocumentLike {
  flags?: TokenFlagsLike;
  /**
   * Footprint in **grid units** (e.g. `1.2598` for a 32mm base on a 25mm
   * grid). Optional because we refuse to assume one when it is missing —
   * see `deriveBaseFromFootprint`.
   */
  width?: number;
  height?: number;
}

/**
 * A token as the base model sees it. Two shapes satisfy this:
 *
 * 1. A **canvas Token placeable** — has `document`, and its own `width`/
 *    `height` are PIXI rendered bounds in pixels, not grid units. They are
 *    declared here only so the type reflects reality; `base-model` must never
 *    read them off a placeable (doing so was a live bug: a 32mm base measured
 *    as 800mm, collapsing every base-to-base distance to 0).
 * 2. A **plain object** — no `document`, flags and footprint (in grid units)
 *    at the top level. Used by `measure.between`'s callers and by tests.
 *
 * The presence of `document` is what distinguishes them, and is therefore what
 * decides where the footprint may legitimately be read from.
 */
export interface TokenLike {
  document?: TokenDocumentLike;
  flags?: TokenFlagsLike;
  width?: number;
  height?: number;
}

export interface SceneGridLike {
  size: number;
  distance: number;
  /**
   * The scene's distance units, verbatim from Foundry (e.g. `"in"`, `"ft"`).
   * Optional because Foundry does not guarantee it is set; `radiusPx` refuses
   * to convert rather than assuming a unit when it is missing.
   */
  units?: string;
}

export interface SceneLike {
  grid: SceneGridLike;
}

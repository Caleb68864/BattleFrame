import type { SceneGridLike, SceneLike, TokenLike } from "../base/types";

export interface Point2D {
  x: number;
  y: number;
}

export interface MeasurementSceneGrid extends SceneGridLike {
  units?: string;
}

export interface MeasurementScene extends SceneLike {
  grid: MeasurementSceneGrid;
}

/**
 * A token as seen by the measurement service: the base model (from
 * `TokenLike`) plus the pixel-space centre point and the scene it lives on.
 * Gridless-only — `scene.grid` is used purely for the pxPerUnit conversion,
 * never for `measurePath`-style pathfinding.
 */
export interface MeasurableToken extends TokenLike {
  center: Point2D;
  scene: MeasurementScene;
}

/**
 * How two tokens' separation is measured.
 *
 * - `base-to-base` -- the gap between the two bases' edges (0 when touching).
 *   A contact/range basis: some rulesets fight and range base-to-base.
 * - `centre-to-centre` -- the distance between the two centres, base sizes
 *   ignored. A movement/line-of-sight basis other rulesets measure with.
 *
 * Core owns the geometry of both; which one a ruleset measures with is the
 * ruleset's rule, so it is a parameter, not a core default beyond the
 * historically-first `base-to-base`.
 */
export type MeasurementMode = "base-to-base" | "centre-to-centre";

export interface MeasurementResult {
  distance: number;
  units: string;
  mode: MeasurementMode;
}

export interface MeasurementApi {
  between(
    tokenA: MeasurableToken,
    tokenB: MeasurableToken,
    mode?: MeasurementMode
  ): MeasurementResult;
}

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

export type MeasurementMode = "base-to-base";

export interface MeasurementResult {
  distance: number;
  units: string;
  mode: MeasurementMode;
}

export interface MeasurementApi {
  between(tokenA: MeasurableToken, tokenB: MeasurableToken): MeasurementResult;
}

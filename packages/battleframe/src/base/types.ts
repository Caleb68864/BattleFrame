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

export interface TokenLike {
  flags?: TokenFlagsLike;
  width: number;
  height: number;
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

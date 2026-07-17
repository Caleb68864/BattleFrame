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
}

export interface SceneLike {
  grid: SceneGridLike;
}

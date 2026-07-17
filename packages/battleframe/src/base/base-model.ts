import { SYSTEM_ID } from "../constants";
import type { BaseDimensions, SceneLike, TokenLike } from "./types";

/**
 * Assumed physical size, in millimetres, of a single grid square's edge.
 * Used only to derive a base when a token has no explicit base flag.
 */
const DEFAULT_MM_PER_GRID_SQUARE = 25;

/**
 * Millimetres per one unit of scene grid distance (e.g. one "inch" of
 * measured distance). Tabletop miniature scale conventionally maps
 * measured distance to inches, so 1 distance unit == 25.4mm.
 */
const MM_PER_GRID_DISTANCE_UNIT = 25.4;

export class InvalidBaseSizeError extends Error {
  constructor(dimension: "widthMm" | "heightMm", value: number) {
    super(
      `${SYSTEM_ID} | base ${dimension} must be greater than 0, got ${value}`
    );
    this.name = "InvalidBaseSizeError";
  }
}

let hasLoggedMissingBaseFlag = false;

function deriveBaseFromFootprint(token: TokenLike): BaseDimensions {
  const diameterMm =
    Math.max(token.width, token.height) * DEFAULT_MM_PER_GRID_SQUARE;

  return {
    shape: "circle",
    widthMm: diameterMm,
    heightMm: diameterMm
  };
}

function assertValidSize(base: BaseDimensions): void {
  if (!(base.widthMm > 0)) {
    throw new InvalidBaseSizeError("widthMm", base.widthMm);
  }
  if (!(base.heightMm > 0)) {
    throw new InvalidBaseSizeError("heightMm", base.heightMm);
  }
}

/**
 * Reads a token's base dimensions, in millimetres.
 *
 * The `flags.battleframe.base` flag wins when present. When absent, a
 * circular base is derived from the token's rectangular footprint and a
 * one-time debug line is logged (not once per call).
 */
export function getBase(token: TokenLike): BaseDimensions {
  const flaggedBase = token.flags?.battleframe?.base;

  const base = flaggedBase ?? deriveBaseFromFootprint(token);

  if (!flaggedBase && !hasLoggedMissingBaseFlag) {
    hasLoggedMissingBaseFlag = true;
    console.debug(
      `${SYSTEM_ID} | no flags.battleframe.base found on a token; deriving base from footprint`
    );
  }

  assertValidSize(base);

  return base;
}

/**
 * Converts a token's base to a pixel radius using the scene's grid size
 * and distance. Millimetres are the only unit stored on the base model;
 * conversion to pixels happens here, at the boundary.
 */
export function radiusPx(token: TokenLike, scene: SceneLike): number {
  const base = getBase(token);
  const radiusMm =
    base.shape === "circle"
      ? base.widthMm / 2
      : Math.max(base.widthMm, base.heightMm) / 2;

  const pxPerMm =
    scene.grid.size / (scene.grid.distance * MM_PER_GRID_DISTANCE_UNIT);

  return radiusMm * pxPerMm;
}

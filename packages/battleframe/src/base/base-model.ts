import { SYSTEM_ID } from "../constants";
import type { BaseDimensions, SceneLike, TokenLike } from "./types";

/**
 * Assumed physical size, in millimetres, of a single grid square's edge.
 * Used only to derive a base when a token has no explicit base flag.
 */
const DEFAULT_MM_PER_GRID_SQUARE = 25;

/**
 * Millimetres per one unit of scene grid distance, keyed by the scene's
 * `grid.units` string. The base model stores millimetres and nothing else, so
 * this table is the single place where a scene's units become a length.
 *
 * Every entry is an exact definition, not an approximation: 1in == 25.4mm and
 * 1ft == 12in are both exact by international agreement, so the conversion
 * introduces no error of its own.
 *
 * Keys are matched after `normalizeGridUnit` (trim + lowercase), so `"In"`,
 * `"ft "` and `"FEET"` all resolve. Aliases are listed explicitly rather than
 * guessed at by prefix matching: a unit this table does not name is a unit
 * this code refuses to convert (see `UnknownGridUnitError`). Adding a unit is
 * a deliberate edit here, never an inference at the call site.
 */
export const GRID_UNIT_MM: Readonly<Record<string, number>> = Object.freeze({
  in: 25.4,
  inch: 25.4,
  inches: 25.4,
  '"': 25.4,
  ft: 25.4 * 12,
  foot: 25.4 * 12,
  feet: 25.4 * 12,
  "'": 25.4 * 12,
  mm: 1,
  cm: 10,
  m: 1000
});

export class InvalidBaseSizeError extends Error {
  constructor(dimension: "widthMm" | "heightMm", value: number) {
    super(
      `${SYSTEM_ID} | base ${dimension} must be greater than 0, got ${value}`
    );
    this.name = "InvalidBaseSizeError";
  }
}

/**
 * Thrown when a scene's grid units cannot be converted to millimetres.
 *
 * There is deliberately no fallback unit. Guessing "inches" on a scene
 * configured in feet is a silent 12x error in every base radius and therefore
 * in every base-to-base distance — a wrong number with no error attached to
 * it. Per trade-off #2, this fails loudly instead.
 */
export class UnknownGridUnitError extends Error {
  constructor(units: string | undefined) {
    const supported = Object.keys(GRID_UNIT_MM).join(", ");
    super(
      `${SYSTEM_ID} | cannot convert base millimetres for scene grid units ` +
        `${units === undefined ? "<missing>" : JSON.stringify(units)}; ` +
        `no unit is assumed. Set the scene's grid units to one of: ${supported}`
    );
    this.name = "UnknownGridUnitError";
  }
}

/**
 * Canonicalises a scene's units string for lookup: surrounding whitespace is
 * stripped and case is folded, so `"In"` and `"ft "` behave as `"in"`/`"ft"`.
 * Nothing else is normalised — no pluralisation, no prefix matching.
 */
export function normalizeGridUnit(units: string): string {
  return units.trim().toLowerCase();
}

/**
 * Millimetres per one unit of the given scene grid distance.
 *
 * Exported so the conversion is inspectable on its own (SS-04: measurement
 * must be debuggable, not implicit) — a suspect distance can be checked here
 * without reaching through `radiusPx`.
 *
 * Throws `UnknownGridUnitError` for absent, empty or unrecognised units.
 */
export function mmPerGridDistanceUnit(units: string | undefined): number {
  if (typeof units !== "string") {
    throw new UnknownGridUnitError(units);
  }

  const mm = GRID_UNIT_MM[normalizeGridUnit(units)];

  if (mm === undefined) {
    throw new UnknownGridUnitError(units);
  }

  return mm;
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
 * Converts a token's base to a pixel radius using the scene's grid size,
 * distance and units. Millimetres are the only unit stored on the base model;
 * conversion to pixels happens here, at the boundary.
 *
 * The scene's `grid.units` is read, never assumed — an inches scene and a feet
 * scene differ by exactly 12x, and picking wrong produces no error, just a
 * wrong radius and therefore a wrong base-to-base distance. Unconvertible
 * units throw `UnknownGridUnitError`.
 */
export function radiusPx(token: TokenLike, scene: SceneLike): number {
  const base = getBase(token);
  const radiusMm =
    base.shape === "circle"
      ? base.widthMm / 2
      : Math.max(base.widthMm, base.heightMm) / 2;

  const mmPerDistanceUnit = mmPerGridDistanceUnit(scene.grid.units);
  const pxPerMm = scene.grid.size / (scene.grid.distance * mmPerDistanceUnit);

  return radiusMm * pxPerMm;
}

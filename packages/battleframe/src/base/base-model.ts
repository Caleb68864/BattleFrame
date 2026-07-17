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

/**
 * Thrown when a token has neither a base flag nor a footprint that can be
 * trusted to be in grid units.
 *
 * There is deliberately no fallback footprint. This error exists because its
 * absence was a shipped bug: `deriveBaseFromFootprint` read `.width`/`.height`
 * off a canvas Token placeable, where those are PIXI rendered bounds in
 * pixels, not grid units. A 32mm-based token reported `height = 32`, which
 * became a 800mm base, a 15.7in radius, and a base-to-base distance of 0 for
 * every pair on the canvas. Nothing threw; the numbers were merely wrong.
 *
 * Per trade-off #2 (loud failure over plausible output), refusing to guess is
 * the only defensible answer. A token whose footprint we cannot read in grid
 * units gives us nothing to derive *from* — anything we returned would be a
 * number with no provenance, which is exactly the failure mode above.
 */
export class MissingBaseFootprintError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | cannot determine a base for a token: no ` +
        `flags.${SYSTEM_ID}.base and no footprint in grid units ` +
        `(document.width/height); no base is assumed. Set the token's ` +
        `base flag, or measure a token backed by a TokenDocument.`
    );
    this.name = "MissingBaseFootprintError";
  }
}

let hasLoggedMissingBaseFlag = false;

/**
 * The token's footprint in **grid units**, or `undefined` if it cannot be read.
 *
 * The presence of `document` is the discriminator, and it is load-bearing:
 *
 * - A **placeable** (has `document`) keeps its footprint on the document.
 *   Its own `.width`/`.height` are PIXI bounds — measured live on a 32mm
 *   token: `placeable.width === 9`, `placeable.height === 32`, while
 *   `document.width === 1.2598`. So when a document is present we read it and
 *   read nothing else: falling back to the placeable's bounds would silently
 *   reintroduce the original bug.
 * - A **plain object** (no `document`) carries its footprint at the top level,
 *   already in grid units. That path is safe precisely because there is no
 *   PIXI container to confuse it with.
 */
function footprintGridUnits(
  token: TokenLike
): { width: number; height: number } | undefined {
  const source = token.document ?? token;

  return typeof source.width === "number" && typeof source.height === "number"
    ? { width: source.width, height: source.height }
    : undefined;
}

function deriveBaseFromFootprint(token: TokenLike): BaseDimensions {
  const footprint = footprintGridUnits(token);

  if (footprint === undefined) {
    throw new MissingBaseFootprintError();
  }

  const diameterMm =
    Math.max(footprint.width, footprint.height) * DEFAULT_MM_PER_GRID_SQUARE;

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
 * The base flag wins when present. It is read from `document.flags` first,
 * because that is where Foundry actually stores it: a canvas Token placeable
 * has no `flags` of its own (`'flags' in placeable` is `false` on v14), so
 * reading only `token.flags` finds nothing on every real token and silently
 * falls through to the derive path. The top-level `flags` fallback serves the
 * plain-object shape used by `measure.between`'s callers and by tests.
 *
 * When no flag is present, a circular base is derived from the token's
 * footprint (which may throw — see `MissingBaseFootprintError`) and a one-time
 * debug line is logged (not once per call).
 */
export function getBase(token: TokenLike): BaseDimensions {
  const flaggedBase =
    token.document?.flags?.battleframe?.base ?? token.flags?.battleframe?.base;

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

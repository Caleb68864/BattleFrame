import { battleframeNamespace } from "../api/index";
import { assertGridlessScene, radiusPx } from "../base/base-model";
import { SYSTEM_ID } from "../constants";
import type { MeasurableToken } from "../measurement/types";
import type {
  Area,
  AreaApi,
  CircleArea,
  ContainmentMode,
  Point,
  RectangleArea,
  RegionShapeData
} from "./types";

/**
 * Areas of effect on a gridless board: shapes, and which models they catch.
 *
 * ## Why this does not use `RegionDocument#testPoint`
 *
 * Scene Regions are v14's replacement for MeasuredTemplates, and a Region can
 * answer `testPoint` without being persisted -- measured live on v14.363, an
 * unsaved Region computes `polygons`, `area`, `bounds` and `testPoint` with no
 * server round-trip and nothing written to the scene. So it was a real
 * candidate for the containment engine. It is still the wrong tool, twice:
 *
 * 1. **`testPoint` tests a point. Models are discs.** A model whose base is
 *    half under a blast, but whose centre is not, would read "not hit" --
 *    wrong in every miniatures game researched.
 * 2. **A Region circle is a 63-vertex polygon**, inscribed, 0.165% under-area.
 *    A point at exactly the true radius tests `false`. The error is small but
 *    systematically biased toward excluding, and "is this model under the
 *    blast" is a binary, contested call.
 *
 * So containment is plain exact arithmetic on the base model, consistent with
 * `measure.between` -- the same conclusion that measurement reached. Regions
 * remain the right tool for *drawing* a marker; see `toRegionShapes`.
 *
 * ## What this owns and does not own
 *
 * Shapes and containment. **No blast rules, no AoE damage, no falloff, and no
 * opinion on which containment mode is correct** -- those are ruleset logic.
 */

/** Scene distance units -> pixels, exactly as `measure.between` derives it. */
function pxPerUnit(scene: MeasurableToken["scene"]): number {
  return scene.grid.size / scene.grid.distance;
}

/**
 * Thrown when an area is constructed with a non-positive extent.
 *
 * The same stance `base-model` takes with `InvalidBaseSizeError`: a zero or
 * negative radius/width/height is a caller bug, and the alternative is a
 * silently meaningless containment result -- a blast that catches everything
 * or nothing -- which per trade-off #2 is worse than failing loud. No extent
 * is assumed or coerced.
 */
export class InvalidAreaError extends Error {
  constructor(dimension: "radius" | "width" | "height", value: number) {
    super(`${SYSTEM_ID} | area ${dimension} must be greater than 0, got ${value}`);
    this.name = "InvalidAreaError";
  }
}

function assertPositive(dimension: "radius" | "width" | "height", value: number): void {
  // `!(value > 0)` rather than `value <= 0` so NaN is rejected too.
  if (!(value > 0)) {
    throw new InvalidAreaError(dimension, value);
  }
}

export function circle(centre: Point, radius: number): CircleArea {
  assertPositive("radius", radius);

  return { kind: "circle", centre, radius };
}

export function rectangle(
  x: number,
  y: number,
  width: number,
  height: number
): RectangleArea {
  assertPositive("width", width);
  assertPositive("height", height);

  return { kind: "rectangle", x, y, width, height };
}

/**
 * Distance from a point to the nearest point of an axis-aligned rectangle, in
 * pixels. Zero when the point is inside. The standard clamp-and-hypot: clamp
 * the point into the rect, then measure to the clamped point.
 */
function pointToRectPx(
  point: Point,
  rect: RectangleArea,
  scene: MeasurableToken["scene"]
): number {
  const scale = pxPerUnit(scene);
  const widthPx = rect.width * scale;
  const heightPx = rect.height * scale;

  const nearestX = Math.min(Math.max(point.x, rect.x), rect.x + widthPx);
  const nearestY = Math.min(Math.max(point.y, rect.y), rect.y + heightPx);

  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

/**
 * Whether a token is inside an area.
 *
 * `mode` defaults to `base-overlap`: a model is caught if its base overlaps
 * the area at all. This default is a **committed engine default, not a rule**
 * -- it is the reading most researched games use, and a ruleset whose rule
 * differs must pass `centre` explicitly rather than rely on this.
 *
 * Circle containment sums the radii before comparing, matching
 * `measure.between`: `centreDist <= areaRadius + baseRadius` rather than
 * `centreDist - baseRadius <= areaRadius`. The subtracted form is not
 * bit-identical under IEEE-754 depending on operand order, and a boundary
 * comparison is exactly where that bites.
 */
export function contains(
  area: Area,
  token: MeasurableToken,
  mode: ContainmentMode = "base-overlap"
): boolean {
  const scene = token.scene;
  assertGridlessScene(scene);
  const scale = pxPerUnit(scene);
  const baseRadiusPx = mode === "centre" ? 0 : radiusPx(token, scene);

  if (area.kind === "circle") {
    const centreDistPx = Math.hypot(
      token.center.x - area.centre.x,
      token.center.y - area.centre.y
    );

    return centreDistPx <= area.radius * scale + baseRadiusPx;
  }

  return pointToRectPx(token.center, area, scene) <= baseRadiusPx;
}

/** Every token the area catches, in input order. */
export function tokensInside(
  area: Area,
  tokens: readonly MeasurableToken[],
  mode: ContainmentMode = "base-overlap"
): MeasurableToken[] {
  return tokens.filter((token) => contains(area, token, mode));
}

/**
 * The area as `RegionDocument#shapes` data, for callers that want to *draw* a
 * marker. Purely a rendering concern -- containment never reads this, because
 * a Region circle is a 63-gon and this one is exact.
 *
 * Persisting is deliberately not this service's job. An unsaved Region renders
 * and measures with no server round-trip and no orphan risk, so a caller who
 * only wants a preview should never create a Document at all; a caller who
 * wants a marker other clients can see calls `RegionDocument.create` itself
 * and owns that lifecycle.
 */
export function toRegionShapes(
  area: Area,
  scene: MeasurableToken["scene"]
): RegionShapeData[] {
  const scale = pxPerUnit(scene);

  if (area.kind === "circle") {
    return [
      {
        type: "circle",
        x: area.centre.x,
        y: area.centre.y,
        radius: area.radius * scale
      }
    ];
  }

  return [
    {
      type: "rectangle",
      x: area.x,
      y: area.y,
      width: area.width * scale,
      height: area.height * scale
    }
  ];
}

export function createAreaApi(): AreaApi {
  return { circle, rectangle, contains, tokensInside, toRegionShapes };
}

declare global {
  interface BattleframeGameNamespace {
    areas?: AreaApi;
  }
}

/**
 * Installs onto the shared namespace rather than onto `game`, for the same
 * reason as `installMeasurementApi` -- see ../api/index.
 */
export function installAreaApi(): AreaApi {
  const namespace = battleframeNamespace();
  namespace.areas = namespace.areas ?? createAreaApi();

  return namespace.areas;
}

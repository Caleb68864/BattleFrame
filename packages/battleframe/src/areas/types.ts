import type { MeasurableToken } from "../measurement/types";

/** A point in scene pixel space, matching `MeasurableToken["center"]`. */
export interface Point {
  x: number;
  y: number;
}

/**
 * A circular area. `radius` is in the scene's **distance units** (inches on a
 * Battleframe scene), not pixels and not millimetres -- the same unit
 * `measure.between` reports. Blast markers are quoted in inches by every
 * ruleset researched; converting at the boundary keeps callers in rules units.
 */
export interface CircleArea {
  kind: "circle";
  centre: Point;
  radius: number;
}

/**
 * An axis-aligned rectangular area. `x`/`y` are the top-left corner in scene
 * pixel space (matching Foundry's own rectangle convention); `width`/`height`
 * are in scene **distance units**, as with `CircleArea.radius`.
 */
export interface RectangleArea {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A circle swept along a segment: every point within `radius` of the segment
 * from `from` to `to` (a stadium). The shape of a template that travels or
 * sweeps along a line. `from`/`to` are in scene pixel space; `radius` is in
 * scene **distance units**, as with `CircleArea.radius`. Equal end points make
 * it a circle.
 */
export interface CapsuleArea {
  kind: "capsule";
  from: Point;
  to: Point;
  radius: number;
}

export type Area = CircleArea | RectangleArea | CapsuleArea;

/**
 * How a ruleset decides whether a model is "in" an area.
 *
 * **Core does not pick one.** Which predicate is correct is a rule, and the
 * researched games disagree: some catch a model whose base is merely touched
 * by the blast, others require the model's centre to be under it. Core owns
 * the geometry; the ruleset owns the choice.
 *
 * - `base-overlap` -- the model's base overlaps the area at all.
 * - `centre` -- the model's centre point is inside the area; base size is
 *   ignored entirely.
 */
export type ContainmentMode = "base-overlap" | "centre";

/**
 * A Region shape descriptor, as `RegionDocument#shapes` accepts it. Returned
 * by `toRegionShapes` for callers that want a *visible* marker; containment
 * never goes through this (see `areas/area.ts` for why).
 */
export type RegionShapeData =
  | {
      type: "circle" | "rectangle";
      x: number;
      y: number;
      radius?: number;
      width?: number;
      height?: number;
    }
  | {
      type: "polygon";
      /** Polygon vertices as a flat `[x0, y0, x1, y1, ...]` list, in pixels. */
      points: number[];
    };

export interface AreaApi {
  circle(centre: Point, radius: number): CircleArea;
  rectangle(x: number, y: number, width: number, height: number): RectangleArea;
  capsule(from: Point, to: Point, radius: number): CapsuleArea;
  contains(area: Area, token: MeasurableToken, mode?: ContainmentMode): boolean;
  tokensInside(
    area: Area,
    tokens: readonly MeasurableToken[],
    mode?: ContainmentMode
  ): MeasurableToken[];
  toRegionShapes(area: Area, scene: MeasurableToken["scene"]): RegionShapeData[];
}

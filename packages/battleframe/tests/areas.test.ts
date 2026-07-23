import { describe, expect, it } from "vitest";

import {
  circle,
  contains,
  createAreaApi,
  InvalidAreaError,
  rectangle,
  toRegionShapes,
  tokensInside
} from "../src/areas/area";
import {
  MM_PER_UNIT,
  PX_PER_UNIT,
  gridlessScene,
  makeFixturePlaceableToken,
  seededRandom
} from "./fixtures/known-distances";

/**
 * Every token here is `makeFixturePlaceableToken` -- shaped like a real canvas
 * placeable (flags on `document`, deliberately wrong top-level width/height).
 * A friendlier double is what let base-to-base measurement pass 189 tests
 * while returning 0 for every real token.
 */

/** A 32mm-based knight at (x, y). 32mm on a 25.4mm-per-unit scene = 1.2598 units wide. */
function knightAt(x: number, y: number, widthMm = 32) {
  return makeFixturePlaceableToken({
    x,
    y,
    widthMm,
    documentWidth: widthMm / MM_PER_UNIT
  });
}

/** Base radius of a 32mm model, in distance units (inches). */
const BASE_RADIUS_UNITS = 32 / 2 / MM_PER_UNIT; // 0.6299...

describe("containment tolerates a degenerate grid (defensive; not reachable from a real scene)", () => {
  it("does not treat every token as inside when grid.distance is zero", () => {
    // area's pxPerUnit = size/distance would be Infinity at distance 0, so
    // `radius * scale` = Infinity and a circle would 'contain' a token any
    // distance away. Guard: a degenerate grid falls back to scale 1.
    const token = knightAt(1000, 1000);
    (token as { scene: unknown }).scene = { grid: { size: 100, distance: 0, units: "in" } };
    const area = circle({ x: 0, y: 0 }, 1); // radius 1 unit, centred at origin
    expect(contains(area, token, "base-overlap")).toBe(false);
  });
});

describe("area construction refuses degenerate dimensions", () => {
  // The same contract base-model holds for a base (InvalidBaseSizeError): a
  // zero or negative extent is a caller bug, and a silently-wrong containment
  // result -- a blast that catches everything or nothing -- is worse than a
  // throw. A ruleset computing a blast radius from a weapon profile is exactly
  // where an off-by-sign slips in.
  it("throws for a non-positive circle radius", () => {
    expect(() => circle({ x: 0, y: 0 }, 0)).toThrow(InvalidAreaError);
    expect(() => circle({ x: 0, y: 0 }, -3)).toThrow(InvalidAreaError);
  });

  it("throws for a non-positive rectangle width or height", () => {
    expect(() => rectangle(0, 0, 0, 5)).toThrow(InvalidAreaError);
    expect(() => rectangle(0, 0, 5, -1)).toThrow(InvalidAreaError);
  });

  it("accepts valid dimensions unchanged", () => {
    expect(circle({ x: 0, y: 0 }, 3)).toEqual({ kind: "circle", centre: { x: 0, y: 0 }, radius: 3 });
    expect(rectangle(1, 2, 5, 6)).toEqual({ kind: "rectangle", x: 1, y: 2, width: 5, height: 6 });
  });
});

describe("circle containment is exact, not a 63-gon", () => {
  it("catches a model whose centre is under the blast", () => {
    const area = circle({ x: 1000, y: 1000 }, 3);

    expect(contains(area, knightAt(1000, 1000))).toBe(true);
  });

  it("misses a model well outside", () => {
    const area = circle({ x: 1000, y: 1000 }, 3);
    const far = knightAt(1000 + 10 * PX_PER_UNIT, 1000);

    expect(contains(area, far)).toBe(false);
  });

  it("catches a model whose BASE overlaps but whose CENTRE does not -- the whole point", () => {
    // Centre 3.5in from the blast centre: outside a 3in blast by centre, but a
    // 0.63in base radius reaches in. Region#testPoint would call this a miss.
    const area = circle({ x: 1000, y: 1000 }, 3);
    const token = knightAt(1000 + 3.5 * PX_PER_UNIT, 1000);

    expect(contains(area, token, "base-overlap")).toBe(true);
    expect(contains(area, token, "centre")).toBe(false);
  });

  it("resolves either side of the boundary, a nanometre out", () => {
    const area = circle({ x: 1000, y: 1000 }, 3);
    const boundary = (3 + BASE_RADIUS_UNITS) * PX_PER_UNIT;

    expect(contains(area, knightAt(1000 + boundary - 1e-6, 1000))).toBe(true);
    expect(contains(area, knightAt(1000 + boundary + 1e-6, 1000))).toBe(false);
  });

  it("does NOT promise a decidable exactly-touching case", () => {
    // `(3 + r) * 20` and `3 * 20 + r * 20` differ by 1.42e-14: IEEE-754 does
    // not distribute. So there is no position a caller can construct that is
    // provably ON the boundary -- the answer at that scale depends on which
    // expression built the coordinate, not on geometry.
    //
    // This is the blast-radius twin of the base-contact `=== 0` bug: exact
    // float equality is not a thing a board game can stand on. A ruleset that
    // needs "exactly touching" must define a tolerance in rules units, as
    // greathelm's clash does. This test pins the fact so nobody "fixes" the
    // boundary later and thinks they made it exact.
    const viaSum = (3 + BASE_RADIUS_UNITS) * PX_PER_UNIT;
    const viaParts = 3 * PX_PER_UNIT + BASE_RADIUS_UNITS * PX_PER_UNIT;

    expect(viaSum).not.toBe(viaParts);
    expect(Math.abs(viaSum - viaParts)).toBeLessThan(1e-13);
  });

  it("a bigger base is caught where a smaller one is not, at the same spot", () => {
    // 3.6in out: a 60mm base reaches 4.18in and catches; a 25mm base reaches
    // only 3.49in and does not.
    const area = circle({ x: 1000, y: 1000 }, 3);
    const x = 1000 + 3.6 * PX_PER_UNIT;

    expect(contains(area, knightAt(x, 1000, 60))).toBe(true);
    expect(contains(area, knightAt(x, 1000, 25))).toBe(false);
  });

  it("`centre` mode ignores base size entirely", () => {
    const area = circle({ x: 1000, y: 1000 }, 3);
    const x = 1000 + 3.6 * PX_PER_UNIT;

    expect(contains(area, knightAt(x, 1000, 60), "centre")).toBe(false);
    expect(contains(area, knightAt(x, 1000, 25), "centre")).toBe(false);
  });
});

describe("containment agrees with the geometry it claims", () => {
  it("matches hand-computed overlap on 2000 random placements", () => {
    const rand = seededRandom(20260717);
    const area = circle({ x: 1000, y: 1000 }, 3);

    for (let i = 0; i < 2000; i += 1) {
      const x = 1000 + (rand() - 0.5) * 400;
      const y = 1000 + (rand() - 0.5) * 400;
      const token = knightAt(x, y);

      const centreDistUnits =
        Math.hypot(x - 1000, y - 1000) / PX_PER_UNIT;
      const expected = centreDistUnits <= 3 + BASE_RADIUS_UNITS;

      expect(contains(area, token)).toBe(expected);
    }
  });
});

describe("rectangle containment", () => {
  // 4in x 2in rectangle with its top-left corner at (1000, 1000).
  const area = rectangle(1000, 1000, 4, 2);

  it("catches a model inside", () => {
    expect(contains(area, knightAt(1000 + 2 * PX_PER_UNIT, 1000 + 1 * PX_PER_UNIT))).toBe(true);
  });

  it("misses a model well outside", () => {
    expect(contains(area, knightAt(1000 + 20 * PX_PER_UNIT, 1000))).toBe(false);
  });

  it("catches a model just outside an edge whose base overlaps it", () => {
    // Half a base-radius past the right edge: centre out, base in.
    const x = 1000 + 4 * PX_PER_UNIT + (BASE_RADIUS_UNITS / 2) * PX_PER_UNIT;
    const y = 1000 + 1 * PX_PER_UNIT;

    expect(contains(area, knightAt(x, y), "base-overlap")).toBe(true);
    expect(contains(area, knightAt(x, y), "centre")).toBe(false);
  });

  it("handles the corner case -- diagonal distance, not axis distance", () => {
    // Just past the top-right corner diagonally. A naive axis-wise check would
    // wrongly include this; the clamp-and-hypot does not.
    const off = BASE_RADIUS_UNITS * 0.8 * PX_PER_UNIT;
    const token = knightAt(1000 + 4 * PX_PER_UNIT + off, 1000 - off);

    const diagonal = Math.hypot(off, off) / PX_PER_UNIT;
    expect(contains(area, token)).toBe(diagonal <= BASE_RADIUS_UNITS);
  });
});

describe("tokensInside", () => {
  it("returns every caught token, in input order, and nothing else", () => {
    const area = circle({ x: 1000, y: 1000 }, 3);
    const a = knightAt(1000, 1000);
    const far = knightAt(1000 + 20 * PX_PER_UNIT, 1000);
    const b = knightAt(1000 + 1 * PX_PER_UNIT, 1000);

    expect(tokensInside(area, [a, far, b])).toEqual([a, b]);
  });

  it("returns an empty array when the area catches nothing", () => {
    const area = circle({ x: 0, y: 0 }, 1);

    expect(tokensInside(area, [knightAt(9000, 9000)])).toEqual([]);
  });
});

describe("toRegionShapes -- rendering only", () => {
  it("converts a circle's radius from distance units to pixels", () => {
    expect(toRegionShapes(circle({ x: 500, y: 600 }, 3), gridlessScene)).toEqual([
      { type: "circle", x: 500, y: 600, radius: 3 * PX_PER_UNIT }
    ]);
  });

  it("converts a rectangle's extent from distance units to pixels", () => {
    expect(toRegionShapes(rectangle(10, 20, 4, 2), gridlessScene)).toEqual([
      { type: "rectangle", x: 10, y: 20, width: 4 * PX_PER_UNIT, height: 2 * PX_PER_UNIT }
    ]);
  });
});

describe("the area api surface", () => {
  it("exposes exactly the shape/containment verbs and no rules verbs", () => {
    expect(Object.keys(createAreaApi()).sort()).toEqual([
      "circle",
      "contains",
      "rectangle",
      "toRegionShapes",
      "tokensInside"
    ]);
  });
});

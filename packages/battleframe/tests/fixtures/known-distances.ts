import type { MeasurableToken, MeasurementScene } from "../../src/measurement/types";

/**
 * Gridless scene: 100px per grid square, 1 grid square == 5 distance units
 * (the same convention used by base-model.test.ts), so pxPerUnit = 20.
 */
export const gridlessScene: MeasurementScene = {
  grid: {
    size: 100,
    distance: 5,
    units: "in"
  }
};

export const PX_PER_UNIT = gridlessScene.grid.size / gridlessScene.grid.distance;

interface FixtureTokenOptions {
  x: number;
  y: number;
  widthMm: number;
  heightMm?: number;
}

export function makeFixtureToken(options: FixtureTokenOptions): MeasurableToken {
  const heightMm = options.heightMm ?? options.widthMm;

  return {
    width: 1,
    height: 1,
    center: { x: options.x, y: options.y },
    scene: gridlessScene,
    flags: {
      battleframe: {
        base: { shape: "circle", widthMm: options.widthMm, heightMm }
      }
    }
  };
}

export interface KnownDistanceFixture {
  name: string;
  tokenA: MeasurableToken;
  tokenB: MeasurableToken;
  expectedDistance: number;
}

/**
 * Every fixture is gridless, expressed in the same units as `gridlessScene`.
 * `expectedDistance` is centre-to-centre distance (in units) minus the sum
 * of both base radii (also in units) — the base-to-base formula, computed
 * independently of the implementation under test.
 */
export const knownDistanceFixtures: KnownDistanceFixture[] = [
  {
    name: "equal 25.4mm bases, 10 units apart centre-to-centre",
    tokenA: makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 }),
    tokenB: makeFixtureToken({ x: 10 * PX_PER_UNIT, y: 0, widthMm: 25.4 }),
    // centre-to-centre = 10 units; each radius = 12.7mm -> 0.5 units
    expectedDistance: 10 - 0.5 - 0.5
  },
  {
    name: "unequal bases (25.4mm and 50.8mm), diagonal separation",
    tokenA: makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 }),
    tokenB: makeFixtureToken({
      x: 8 * PX_PER_UNIT,
      y: 6 * PX_PER_UNIT,
      widthMm: 50.8
    }),
    // centre-to-centre = hypot(8, 6) = 10 units; radii = 0.5 + 1.0 units
    expectedDistance: 10 - 0.5 - 1.0
  },
  {
    name: "bases exactly touching (zero base-to-base gap)",
    tokenA: makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 }),
    // centre-to-centre = 1 unit == sum of radii (0.5 + 0.5)
    tokenB: makeFixtureToken({ x: 1 * PX_PER_UNIT, y: 0, widthMm: 25.4 }),
    expectedDistance: 0
  },
  {
    name: "overlapping bases clamp to zero, never negative",
    tokenA: makeFixtureToken({ x: 0, y: 0, widthMm: 50.8 }),
    // centre-to-centre = 0.5 units, well inside the combined radii (1.0 + 1.0)
    tokenB: makeFixtureToken({ x: 0.5 * PX_PER_UNIT, y: 0, widthMm: 50.8 }),
    expectedDistance: 0
  }
];

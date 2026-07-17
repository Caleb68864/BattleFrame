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

/**
 * Mirrors `MM_PER_GRID_DISTANCE_UNIT` in `src/base/base-model.ts` (private
 * there). Fixtures use it to convert base sizes in mm to distance units.
 */
export const MM_PER_UNIT = 25.4;

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

interface FixturePlaceableOptions extends FixtureTokenOptions {
  /**
   * Footprint in grid units, as it appears on a real `TokenDocument`
   * (e.g. 1.2598 for a 32mm base on a 25mm grid) — NOT an integer count of
   * squares.
   */
  documentWidth: number;
  documentHeight?: number;
}

/**
 * A token shaped like a **real Foundry canvas Token placeable**, as observed
 * live on v14.363 — not like a convenient test double.
 *
 * The three properties that matter, and that the old plain-object fixture got
 * wrong by being convenient:
 *
 * 1. **No top-level `flags`.** `'flags' in placeable` is `false` on a real
 *    placeable; the flags live on `document.flags`. Every fixture setting
 *    `flags` at the top level made `getBase` look correct while it found
 *    nothing on every real token.
 * 2. **`document.width`/`height` in grid units.**
 * 3. **Top-level `width`/`height` present but WRONG** — a placeable is a PIXI
 *    container, so these are rendered bounds in pixels. The live values on a
 *    32mm-based token were 9 and 32. This is the trap: a fixture that simply
 *    omits them cannot catch code that reads them, because `undefined` fails
 *    loudly while `32` produces a plausible, silent, 25x-too-large base.
 */
export function makeFixturePlaceableToken(
  options: FixturePlaceableOptions
): MeasurableToken {
  const heightMm = options.heightMm ?? options.widthMm;

  return {
    // PIXI rendered bounds in pixels. Deliberately bogus as grid units, and
    // deliberately not equal to each other, so any code reading them produces
    // a distinctly wrong answer rather than an accidentally right one.
    width: 9,
    height: 32,
    center: { x: options.x, y: options.y },
    scene: gridlessScene,
    document: {
      width: options.documentWidth,
      height: options.documentHeight ?? options.documentWidth,
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: options.widthMm, heightMm }
        }
      }
    }
  };
}

/**
 * Deterministic PRNG (mulberry32) for property tests. `Math.random()` is
 * banned repo-wide, and a property test that fails only on some runs is worse
 * than no property test at all — a fixed seed makes any counter-example
 * reproducible from the seed alone.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A 32mm round base, the standard for a rank-and-file knight. Its footprint in
 * grid units is 32mm / 25.4mm-per-inch — the non-integer value a real
 * TokenDocument carries, not a tidy 1.
 */
const KNIGHT_BASE_MM = 32;
const KNIGHT_DOCUMENT_GRID_UNITS = KNIGHT_BASE_MM / MM_PER_UNIT; // 1.2598...

export const KNIGHT_A: MeasurableToken = makeFixturePlaceableToken({
  x: 0,
  y: 0,
  widthMm: KNIGHT_BASE_MM,
  documentWidth: KNIGHT_DOCUMENT_GRID_UNITS
});

export const KNIGHT_B: MeasurableToken = makeFixturePlaceableToken({
  x: 3 * PX_PER_UNIT,
  y: 0,
  widthMm: KNIGHT_BASE_MM,
  documentWidth: KNIGHT_DOCUMENT_GRID_UNITS
});

/**
 * 3 units centre-to-centre, minus two 16mm radii expressed in units.
 * Evaluates to 1.7401574803149606. The bug this fixture exists to catch made
 * it 0.
 */
export const KNIGHTS_3_UNITS_APART_EXPECTED =
  3 - (KNIGHT_BASE_MM / 2 / MM_PER_UNIT) * 2;

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
  },
  {
    // The regression case, in the shape it actually shipped in: two 32mm
    // knights 3 inches apart on the canvas. Before the fix this measured 0,
    // because the flag was invisible on `token.flags` and the derive path read
    // the placeable's PIXI bounds (max(9, 32) * 25mm = an 800mm base).
    name: "real canvas placeables: two 32mm knights 3 units apart",
    tokenA: KNIGHT_A,
    tokenB: KNIGHT_B,
    // centre-to-centre = 3 units; each radius = 16mm -> 16/25.4 units
    expectedDistance: KNIGHTS_3_UNITS_APART_EXPECTED
  }
];

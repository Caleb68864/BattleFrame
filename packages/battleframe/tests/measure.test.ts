import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  between,
  installMeasurementApi,
  SceneMismatchError
} from "../src/measurement/measure";
import type { MeasurementApi } from "../src/measurement/types";
import {
  gridlessScene,
  KNIGHT_A,
  KNIGHT_B,
  knownDistanceFixtures,
  makeFixturePlaceableToken,
  makeFixtureToken,
  MM_PER_UNIT,
  PX_PER_UNIT,
  seededRandom
} from "./fixtures/known-distances";

describe("measure.between", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  it("returns {distance, units, mode: 'base-to-base'} for two tokens", () => {
    const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 });
    const tokenB = makeFixtureToken({ x: 10 * PX_PER_UNIT, y: 0, widthMm: 25.4 });

    const result = between(tokenA, tokenB);

    expect(result).toEqual({
      distance: expect.any(Number),
      units: gridlessScene.grid.units,
      mode: "base-to-base"
    });
  });

  it.each(knownDistanceFixtures)(
    "matches the known-distance fixture: $name",
    ({ tokenA, tokenB, expectedDistance }) => {
      const result = between(tokenA, tokenB);
      expect(result.distance).toBeCloseTo(expectedDistance, 10);
    }
  );

  it("returns exactly 0 when bases touch, not a small positive number", () => {
    const touching = knownDistanceFixtures.find(
      (fixture) => fixture.name === "bases exactly touching (zero base-to-base gap)"
    );
    if (!touching) {
      throw new Error("expected a touching-bases fixture");
    }

    const result = between(touching.tokenA, touching.tokenB);
    expect(result.distance).toBe(0);
  });

  it("clamps overlapping bases to 0, never negative", () => {
    const overlapping = knownDistanceFixtures.find(
      (fixture) => fixture.name === "overlapping bases clamp to zero, never negative"
    );
    if (!overlapping) {
      throw new Error("expected an overlapping-bases fixture");
    }

    const result = between(overlapping.tokenA, overlapping.tokenB);
    expect(result.distance).toBe(0);
    expect(result.distance).not.toBeLessThan(0);
  });

  it("is symmetric: between(a, b) === between(b, a), exactly, for generated inputs", () => {
    const random = seededRandom(0x5eed_1234);
    const iterations = 20_000;

    // Track that the generator actually reaches each regime, so the property
    // cannot silently pass by only ever producing one kind of pair.
    let overlapping = 0;
    let touching = 0;
    let distant = 0;
    let unequalRadii = 0;

    for (let i = 0; i < iterations; i++) {
      // Unequal, deliberately non-binary-exact base sizes: the ulp-level
      // asymmetry only shows up when the radii are not exact binary values.
      const widthAMm = 5 + random() * 95;
      const widthBMm = 5 + random() * 95;
      if (widthAMm !== widthBMm) {
        unequalRadii++;
      }

      const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: widthAMm });

      // Combined radii in px, so separation can be expressed as a multiple of
      // it: <1 overlaps, ~1 touches, >1 is a clear gap.
      const combinedRadiusPx =
        ((widthAMm / 2 + widthBMm / 2) / MM_PER_UNIT) * PX_PER_UNIT;

      const separationFactor = random() * 4;
      const separationPx = combinedRadiusPx * separationFactor;

      if (separationFactor < 0.98) {
        overlapping++;
      } else if (separationFactor <= 1.02) {
        touching++;
      } else {
        distant++;
      }

      // Arbitrary angle, so dx and dy are both non-trivial.
      const angle = random() * 2 * Math.PI;
      const tokenB = makeFixtureToken({
        x: separationPx * Math.cos(angle),
        y: separationPx * Math.sin(angle),
        widthMm: widthBMm
      });

      const forward = between(tokenA, tokenB);
      const backward = between(tokenB, tokenA);

      // Strict equality, not toBeCloseTo: an ulp of asymmetry is still a
      // failure of the commutativity property.
      expect(forward.distance).toBe(backward.distance);
      expect(forward).toEqual(backward);
    }

    expect(overlapping).toBeGreaterThan(0);
    expect(touching).toBeGreaterThan(0);
    expect(distant).toBeGreaterThan(0);
    expect(unequalRadii).toBeGreaterThan(0);
  });

  it("is symmetric for the known-distance fixtures too", () => {
    for (const fixture of knownDistanceFixtures) {
      const forward = between(fixture.tokenA, fixture.tokenB);
      const backward = between(fixture.tokenB, fixture.tokenA);
      expect(forward.distance).toBe(backward.distance);
    }
  });

  it("throws rather than silently measuring across mismatched scenes", () => {
    const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 });
    const tokenB = makeFixtureToken({ x: 10 * PX_PER_UNIT, y: 0, widthMm: 25.4 });

    // tokenB lives on a scene with a different distance scale: measuring with
    // tokenA's pxPerUnit would return a plausible but meaningless number.
    tokenB.scene = {
      grid: { size: 100, distance: 10, units: "in" }
    };

    expect(() => between(tokenA, tokenB)).toThrow(SceneMismatchError);
    expect(() => between(tokenB, tokenA)).toThrow(SceneMismatchError);
  });

  it("allows structurally identical scene objects", () => {
    const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 });
    const tokenB = makeFixtureToken({ x: 10 * PX_PER_UNIT, y: 0, widthMm: 25.4 });

    tokenB.scene = { grid: { ...gridlessScene.grid } };

    expect(() => between(tokenA, tokenB)).not.toThrow();
  });

  it("equals centre-to-centre minus the sum of base radii for non-overlapping tokens", () => {
    const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 });
    const tokenB = makeFixtureToken({ x: 20 * PX_PER_UNIT, y: 0, widthMm: 50.8 });

    const centreToCentreUnits = 20;
    const radiusAUnits = 25.4 / 2 / 25.4;
    const radiusBUnits = 50.8 / 2 / 25.4;

    const result = between(tokenA, tokenB);

    expect(result.distance).toBeCloseTo(
      centreToCentreUnits - radiusAUnits - radiusBUnits,
      10
    );
  });

  describe("real canvas Token placeables", () => {
    // Regression: every test above hands `between` a plain object with `flags`
    // at the top level. Real tokens have no top-level `flags` at all — the
    // flag lives on `document.flags`, and the placeable's own `width`/`height`
    // are PIXI bounds. 189 tests passed while base-to-base returned 0 for
    // every real pair, because none of them resembled a real token.

    it("measures two 32mm knights 3 units apart as 1.7401574803149606, not 0", () => {
      const result = between(KNIGHT_A, KNIGHT_B);

      expect(result.distance).toBeCloseTo(1.7401574803149606, 10);
      expect(result.distance).not.toBe(0);
      expect(result.units).toBe("in");
      expect(result.mode).toBe("base-to-base");
    });

    it("resembles a real token: no top-level flags, bogus PIXI width/height", () => {
      // Guards the fixture itself. If it ever grows a top-level `flags`, or
      // loses the wrong `width`/`height`, it stops being able to catch this
      // class of bug and these tests would pass for the wrong reason.
      expect("flags" in KNIGHT_A).toBe(false);
      expect(KNIGHT_A.document?.flags?.battleframe?.base).toEqual({
        shape: "circle",
        widthMm: 32,
        heightMm: 32
      });
      expect(KNIGHT_A.document?.width).toBeCloseTo(1.2598425196850394, 10);
      expect(KNIGHT_A.width).toBe(9);
      expect(KNIGHT_A.height).toBe(32);
    });

    it("ignores the placeable's PIXI bounds entirely", () => {
      // max(9, 32) * 25mm = an 800mm base -> 15.748in radius each -> a 3-unit
      // gap collapses to 0. If the bounds leak back in, this fails.
      const derivedFromPixiRadiusUnits = (32 * 25) / 2 / MM_PER_UNIT;
      expect(derivedFromPixiRadiusUnits * 2).toBeGreaterThan(3);

      expect(between(KNIGHT_A, KNIGHT_B).distance).toBeGreaterThan(1.7);
    });

    it("is symmetric for placeables too", () => {
      expect(between(KNIGHT_A, KNIGHT_B).distance).toBe(
        between(KNIGHT_B, KNIGHT_A).distance
      );
    });

    it("measures a placeable against a plain object, both shapes agreeing", () => {
      // Both shapes must resolve to the same base, or the two callers of this
      // API disagree about where a token is.
      const plain = makeFixtureToken({
        x: 3 * PX_PER_UNIT,
        y: 0,
        widthMm: 32
      });

      expect(between(KNIGHT_A, plain).distance).toBeCloseTo(
        between(KNIGHT_A, KNIGHT_B).distance,
        10
      );
    });

    it("clamps overlapping placeables to 0", () => {
      const near = makeFixturePlaceableToken({
        x: 0.5 * PX_PER_UNIT,
        y: 0,
        widthMm: 32,
        documentWidth: 1.2598425196850394
      });

      expect(between(KNIGHT_A, near).distance).toBe(0);
    });
  });

  it("wires up game.battleframe.measure.between via installMeasurementApi", () => {
    const originalGame = (globalThis as { game?: unknown }).game;
    (globalThis as { game?: unknown }).game = {};

    try {
      installMeasurementApi();

      const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 });
      const tokenB = makeFixtureToken({ x: 10 * PX_PER_UNIT, y: 0, widthMm: 25.4 });

      const result = (
        globalThis as unknown as {
          game: { battleframe: { measure: MeasurementApi } };
        }
      ).game.battleframe.measure.between(tokenA, tokenB);

      expect(result.mode).toBe("base-to-base");
    } finally {
      (globalThis as { game?: unknown }).game = originalGame;
    }
  });
});

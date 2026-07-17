import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  between,
  installMeasurementApi,
  SceneMismatchError
} from "../src/measurement/measure";
import type { MeasurementApi } from "../src/measurement/types";
import {
  gridlessScene,
  knownDistanceFixtures,
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { between, installMeasurementApi } from "../src/measurement/measure";
import type { MeasurementApi } from "../src/measurement/types";
import {
  gridlessScene,
  knownDistanceFixtures,
  makeFixtureToken,
  PX_PER_UNIT
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

  it("is symmetric: between(a, b) === between(b, a)", () => {
    for (const fixture of knownDistanceFixtures) {
      const forward = between(fixture.tokenA, fixture.tokenB);
      const backward = between(fixture.tokenB, fixture.tokenA);
      expect(forward.distance).toBeCloseTo(backward.distance, 10);
    }
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

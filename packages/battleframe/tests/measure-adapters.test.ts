/**
 * Measure adapters (engine-extraction scan #2, findings 2 + 3): expose the
 * px-per-scene-unit ratio the engine already computes privately, and provide the
 * "measurable point" adapters that three modules hand-build so `measure`/`facing`
 * accept a live placeable or a bare coordinate.
 */

import { describe, expect, it } from "vitest";
import { createMeasurementApi } from "../src/measurement/measure";

const api = createMeasurementApi();

describe("measure.pxPerUnit", () => {
  it("computes grid.size / grid.distance from a scene", () => {
    expect(api.pxPerUnit({ grid: { size: 100, distance: 5 } } as any)).toBe(20);
  });

  it("accepts a bare grid too", () => {
    expect(api.pxPerUnit({ size: 60, distance: 6 } as any)).toBe(10);
  });

  it("defaults to 1 when the grid is missing or degenerate", () => {
    expect(api.pxPerUnit(undefined as any)).toBe(1);
    expect(api.pxPerUnit({ grid: { size: 0, distance: 5 } } as any)).toBe(1);
    expect(api.pxPerUnit({ grid: { size: 100, distance: 0 } } as any)).toBe(1);
  });
});

describe("measure.fromPlaceable", () => {
  const scene = { grid: { size: 100, distance: 5 } };

  it("projects a placeable's centre + scene (and base) onto a MeasurableToken", () => {
    const m = api.fromPlaceable({ center: { x: 3, y: 4 }, scene, document: { width: 2, height: 2 } } as any);
    expect(m?.center).toEqual({ x: 3, y: 4 });
    expect(m?.scene).toBe(scene);
  });

  it("returns undefined when the placeable has no centre", () => {
    expect(api.fromPlaceable({ scene } as any)).toBeUndefined();
    expect(api.fromPlaceable(undefined as any)).toBeUndefined();
  });
});

describe("measure.point", () => {
  const scene = { grid: { size: 60, distance: 6 } };

  it("wraps a bare coordinate as a MeasurableToken with a facing rotation", () => {
    const m = api.point({ x: 5, y: 10, scene, rotation: 90 });
    expect(m.center).toEqual({ x: 5, y: 10 });
    expect(m.scene).toBe(scene);
    expect(m.document?.rotation).toBe(90);
  });
});

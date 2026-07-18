import { afterEach, describe, expect, it, vi } from "vitest";
import {
  anyPointVisible,
  boundsSamplePoints,
  createLosApi,
  installLosApi,
  isLineClear,
  type CollisionBackend
} from "../src/vision/los";

/**
 * The engine's line-of-sight service wraps Foundry's wall collision test. The
 * decision logic is pure and takes an injected backend, so it is tested here
 * with a fake tester; the Foundry adapter is feature-detected off
 * CONFIG.Canvas.polygonBackends / ClockwiseSweepPolygon.
 */

/** A backend that reports blocked=true for the segments listed, clear otherwise. */
function fakeBackend(blocked: boolean): CollisionBackend & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    testCollision(origin, destination, config) {
      calls.push({ origin, destination, config });
      return blocked;
    }
  };
}

afterEach(() => {
  delete (globalThis as any).CONFIG;
  delete (globalThis as any).foundry;
});

describe("isLineClear", () => {
  it("is clear when the backend reports no collision", () => {
    const backend = fakeBackend(false);
    expect(isLineClear(backend, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
  });

  it("is blocked when the backend reports a collision", () => {
    const backend = fakeBackend(true);
    expect(isLineClear(backend, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(false);
  });

  it("asks the backend for a sight collision in 'any' mode by default", () => {
    const backend = fakeBackend(false);
    isLineClear(backend, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(backend.calls[0]).toMatchObject({ config: { type: "sight", mode: "any" } });
  });

  it("passes through a non-default restriction type (e.g. move)", () => {
    const backend = fakeBackend(false);
    isLineClear(backend, { x: 0, y: 0 }, { x: 5, y: 5 }, "move");
    expect(backend.calls[0]).toMatchObject({ config: { type: "move", mode: "any" } });
  });
});

describe("anyPointVisible — partial line of sight", () => {
  it("is visible when at least one sample point is clear", () => {
    // Backend blocks everything except returns false only for the 3rd sample.
    let n = 0;
    const backend: CollisionBackend = {
      testCollision: () => (n++ === 2 ? false : true)
    };
    const samples = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 }
    ];
    expect(anyPointVisible(backend, { x: 0, y: 0 }, samples)).toBe(true);
  });

  it("is not visible when every sample is blocked", () => {
    const backend = fakeBackend(true);
    expect(anyPointVisible(backend, { x: 0, y: 0 }, [{ x: 1, y: 1 }, { x: 2, y: 2 }])).toBe(false);
  });
});

describe("boundsSamplePoints", () => {
  it("returns the centre and four corners of the box", () => {
    const points = boundsSamplePoints({ x: 0, y: 0, width: 10, height: 20 });
    expect(points).toEqual([
      { x: 5, y: 10 }, // centre first
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 20 },
      { x: 10, y: 20 }
    ]);
  });
});

describe("createLosApi — Foundry adapter", () => {
  it("fails open (clear) when no canvas/wall backend is available", () => {
    const api = createLosApi();
    expect(api.isClear({ x: 0, y: 0 }, { x: 9, y: 9 })).toBe(true);
    expect(api.between({ center: { x: 0, y: 0 } }, { center: { x: 9, y: 9 } })).toEqual({ clear: true });
  });

  it("uses CONFIG.Canvas.polygonBackends[type].testCollision when present", () => {
    const testCollision = vi.fn(() => true); // blocked
    (globalThis as any).CONFIG = { Canvas: { polygonBackends: { sight: { testCollision } } } };
    const api = createLosApi();
    expect(api.isClear({ x: 0, y: 0 }, { x: 9, y: 9 })).toBe(false);
    expect(testCollision).toHaveBeenCalledOnce();
  });

  it("between samples corners when asked and any corner is visible", () => {
    let n = 0;
    const testCollision = vi.fn(() => n++ > 0); // first sample (centre) clear, rest blocked
    (globalThis as any).CONFIG = { Canvas: { polygonBackends: { sight: { testCollision } } } };
    const api = createLosApi();
    const result = api.between(
      { center: { x: 0, y: 0 } },
      { center: { x: 50, y: 50 }, bounds: { x: 40, y: 40, width: 20, height: 20 } },
      { sample: "corners" }
    );
    expect(result).toEqual({ clear: true });
  });
});

describe("installLosApi", () => {
  it("installs the service on the shared namespace, idempotently", () => {
    const first = installLosApi();
    const second = installLosApi();
    expect(second).toBe(first);
    const ns = (globalThis as unknown as { battleframe?: { los?: unknown } }).battleframe;
    expect(ns?.los).toBeDefined();
  });
});

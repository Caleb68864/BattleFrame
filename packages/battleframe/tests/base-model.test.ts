import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidBaseSizeError,
  getBase,
  radiusPx
} from "../src/base/base-model";
import type { SceneLike, TokenLike } from "../src/base/types";

function makeToken(overrides: Partial<TokenLike> = {}): TokenLike {
  return {
    width: 1,
    height: 1,
    flags: undefined,
    ...overrides
  };
}

const scene: SceneLike = {
  grid: {
    size: 100,
    distance: 5
  }
};

describe("getBase", () => {
  it("reads a circle base from token flags", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 32, heightMm: 32 }
        }
      }
    });

    expect(getBase(token)).toEqual({
      shape: "circle",
      widthMm: 32,
      heightMm: 32
    });
  });

  it("reads an oval base from token flags", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "oval", widthMm: 60, heightMm: 35 }
        }
      }
    });

    expect(getBase(token)).toEqual({
      shape: "oval",
      widthMm: 60,
      heightMm: 35
    });
  });

  it("derives a circle from the token footprint when the flag is absent, logging once", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const tokenA = makeToken({ width: 2, height: 1 });
    const tokenB = makeToken({ width: 1, height: 1 });

    const baseA = getBase(tokenA);
    const baseB = getBase(tokenB);

    expect(baseA.shape).toBe("circle");
    expect(baseA.widthMm).toBe(baseA.heightMm);
    expect(baseB.shape).toBe("circle");

    const missingFlagLogs = debugSpy.mock.calls.filter(([message]) =>
      String(message).includes("deriving base from footprint")
    );
    expect(missingFlagLogs.length).toBeLessThanOrEqual(1);

    debugSpy.mockRestore();
  });

  it("prefers the flag over the footprint when both are present", () => {
    const token = makeToken({
      width: 4,
      height: 4,
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 25, heightMm: 25 }
        }
      }
    });

    const base = getBase(token);

    expect(base.widthMm).toBe(25);
    expect(base.widthMm).not.toBe(4 * 25);
  });

  it("throws a specific error for a zero-size base and never coerces", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 0, heightMm: 0 }
        }
      }
    });

    expect(() => getBase(token)).toThrow(InvalidBaseSizeError);
  });

  it("throws for a negative-size base", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "oval", widthMm: 30, heightMm: -5 }
        }
      }
    });

    expect(() => getBase(token)).toThrow(InvalidBaseSizeError);
  });
});

describe("radiusPx", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  it("converts mm to pixels using the scene grid size and distance", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 25.4, heightMm: 25.4 }
        }
      }
    });

    // pxPerMm = size / (distance * mmPerDistanceUnit) = 100 / (5 * 25.4)
    const expectedPxPerMm = 100 / (5 * 25.4);
    const expectedRadiusPx = (25.4 / 2) * expectedPxPerMm;

    expect(radiusPx(token, scene)).toBeCloseTo(expectedRadiusPx, 10);
  });

  it("uses the larger axis of an oval base for the radius", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "oval", widthMm: 60, heightMm: 35 }
        }
      }
    });

    const expectedPxPerMm = 100 / (5 * 25.4);
    const expectedRadiusPx = (60 / 2) * expectedPxPerMm;

    expect(radiusPx(token, scene)).toBeCloseTo(expectedRadiusPx, 10);
  });

  it("supports a base larger than its token footprint", () => {
    const token = makeToken({
      width: 1,
      height: 1,
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 100, heightMm: 100 }
        }
      }
    });

    const expectedPxPerMm = 100 / (5 * 25.4);
    const expectedRadiusPx = (100 / 2) * expectedPxPerMm;

    expect(radiusPx(token, scene)).toBeCloseTo(expectedRadiusPx, 10);
  });

  it("throws for a zero-size base instead of returning a coerced radius", () => {
    const token = makeToken({
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 0, heightMm: 0 }
        }
      }
    });

    expect(() => radiusPx(token, scene)).toThrow(InvalidBaseSizeError);
  });
});

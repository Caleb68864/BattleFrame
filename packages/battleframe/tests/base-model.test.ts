import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidBaseSizeError,
  MissingBaseFootprintError,
  UnknownGridUnitError,
  getBase,
  mmPerGridDistanceUnit,
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

function makeScene(units: string | undefined): SceneLike {
  return {
    grid: {
      size: 100,
      distance: 5,
      units
    }
  };
}

function circleToken(diameterMm: number): TokenLike {
  return makeToken({
    flags: {
      battleframe: {
        base: { shape: "circle", widthMm: diameterMm, heightMm: diameterMm }
      }
    }
  });
}

const scene: SceneLike = makeScene("in");

describe("radiusPx — degenerate grid guard", () => {
  it("returns 0 (not Infinity/NaN) when grid.distance is zero", () => {
    // measure.between routes base-to-base through radiusPx; a scene whose
    // grid.distance is 0 would make pxPerMm = size/(0*mm) = Infinity, so the base
    // radius blows up and every base-to-base distance goes negative/NaN. Guard it:
    // a degenerate grid has no measurable base extent -> radius 0 (base-to-base
    // collapses to centre-to-centre). Foundry's scene schema keeps distance > 0,
    // so this is defensive, not reachable from a persisted scene.
    const degenerate: SceneLike = { grid: { size: 100, distance: 0, units: "in" } };
    const r = radiusPx(circleToken(32), degenerate);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBe(0);
  });
});

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

describe("getBase on a canvas Token placeable", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  /**
   * A real placeable: no top-level `flags`, flags on `document`, footprint in
   * grid units on `document`, and top-level `width`/`height` that are PIXI
   * rendered bounds (the live values off a 32mm-based token on v14.363).
   */
  function makePlaceable(document: TokenLike["document"]): TokenLike {
    return { width: 9, height: 32, document };
  }

  it("reads the base flag from document.flags, where Foundry actually puts it", () => {
    const token = makePlaceable({
      width: 1.2598,
      height: 1.2598,
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

  it("does not derive an 800mm base from the placeable's PIXI bounds", () => {
    const token = makePlaceable({
      width: 1.2598,
      height: 1.2598,
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 32, heightMm: 32 }
        }
      }
    });

    // max(9, 32) * 25 = 800: the exact wrong answer the old code produced.
    expect(getBase(token).widthMm).not.toBe(800);
  });

  it("derives from document.width/height, never the placeable's bounds", () => {
    const token = makePlaceable({ width: 2, height: 1 });

    // 2 grid units * 25mm = 50mm, not max(9, 32) * 25 = 800mm.
    expect(getBase(token)).toEqual({
      shape: "circle",
      widthMm: 50,
      heightMm: 50
    });
  });

  it("prefers document.flags over the top-level flags fallback", () => {
    const token: TokenLike = {
      width: 9,
      height: 32,
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 25, heightMm: 25 }
        }
      },
      document: {
        width: 1.2598,
        height: 1.2598,
        flags: {
          battleframe: {
            base: { shape: "circle", widthMm: 32, heightMm: 32 }
          }
        }
      }
    };

    expect(getBase(token).widthMm).toBe(32);
  });

  it("throws rather than guessing when there is no flag and no document footprint", () => {
    // A placeable with a document but no readable footprint. Falling back to
    // the placeable's own width/height here is exactly the shipped bug, so
    // there is deliberately no fallback: no provenance, no number.
    const token = makePlaceable({});

    expect(() => getBase(token)).toThrow(MissingBaseFootprintError);
  });

  it("throws for a bare object with neither flag nor footprint", () => {
    expect(() => getBase({})).toThrow(MissingBaseFootprintError);
  });

  it("names the flag and the document footprint in the error", () => {
    let caught: unknown;
    try {
      getBase({});
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MissingBaseFootprintError);
    expect((caught as Error).message).toContain("document.width/height");
    expect((caught as Error).message).toContain("battleframe.base");
  });

  it("converts a placeable's flagged base to a radius via radiusPx", () => {
    const token = makePlaceable({
      width: 1.2598,
      height: 1.2598,
      flags: {
        battleframe: {
          base: { shape: "circle", widthMm: 32, heightMm: 32 }
        }
      }
    });

    // pxPerMm = 100 / (5 * 25.4); radius = 16mm
    expect(radiusPx(token, scene)).toBeCloseTo(16 * (100 / (5 * 25.4)), 10);
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

describe("radiusPx grid units", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  it("uses inches when the scene grid units are inches", () => {
    // pxPerMm = size / (distance * 25.4) = 100 / (5 * 25.4)
    const expectedRadiusPx = (25.4 / 2) * (100 / (5 * 25.4));

    expect(radiusPx(circleToken(25.4), makeScene("in"))).toBeCloseTo(
      expectedRadiusPx,
      10
    );
  });

  it("uses feet when the scene grid units are feet", () => {
    // pxPerMm = size / (distance * 25.4 * 12) = 100 / (5 * 304.8)
    const expectedRadiusPx = (25.4 / 2) * (100 / (5 * 304.8));

    expect(radiusPx(circleToken(25.4), makeScene("ft"))).toBeCloseTo(
      expectedRadiusPx,
      10
    );
  });

  it("returns a radius exactly 12x smaller on a feet scene than an inches scene", () => {
    // The whole point: one foot is twelve inches, so the same base spans a
    // twelfth of the pixels. Assuming inches on a feet scene is a silent 12x
    // error in every base-to-base distance.
    const token = circleToken(32);

    const inches = radiusPx(token, makeScene("in"));
    const feet = radiusPx(token, makeScene("ft"));

    expect(inches / feet).toBeCloseTo(12, 10);
  });

  it("accepts documented aliases and tolerates case and surrounding whitespace", () => {
    const token = circleToken(32);
    const inches = radiusPx(token, makeScene("in"));
    const feet = radiusPx(token, makeScene("ft"));

    for (const units of ["In", " in ", "INCH", "inches", '"']) {
      expect(radiusPx(token, makeScene(units))).toBeCloseTo(inches, 10);
    }

    for (const units of ["ft ", "FT", "Foot", "feet", "'"]) {
      expect(radiusPx(token, makeScene(units))).toBeCloseTo(feet, 10);
    }
  });

  it("throws for an unknown unit instead of defaulting to inches", () => {
    const token = circleToken(32);

    expect(() => radiusPx(token, makeScene("furlongs"))).toThrow(
      UnknownGridUnitError
    );
    expect(() => radiusPx(token, makeScene("squares"))).toThrow(
      UnknownGridUnitError
    );
  });

  it("throws for absent or empty units instead of defaulting to inches", () => {
    const token = circleToken(32);

    expect(() => radiusPx(token, makeScene(undefined))).toThrow(
      UnknownGridUnitError
    );
    expect(() => radiusPx(token, makeScene(""))).toThrow(UnknownGridUnitError);
    expect(() => radiusPx(token, makeScene("   "))).toThrow(
      UnknownGridUnitError
    );
  });

  it("names the offending unit and the supported units in the error", () => {
    let caught: unknown;
    try {
      radiusPx(circleToken(32), makeScene("furlongs"));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(UnknownGridUnitError);
    expect((caught as Error).message).toContain("furlongs");
    expect((caught as Error).message).toContain("in");
    expect((caught as Error).message).toContain("ft");
  });
});

describe("mmPerGridDistanceUnit", () => {
  it("exposes the conversion on its own so measurement is inspectable", () => {
    expect(mmPerGridDistanceUnit("in")).toBe(25.4);
    expect(mmPerGridDistanceUnit("ft")).toBe(25.4 * 12);
    // 304.8 / 25.4 is 11.999999999999998 in IEEE-754, not 12 — close, not exact.
    expect(
      mmPerGridDistanceUnit("ft") / mmPerGridDistanceUnit("in")
    ).toBeCloseTo(12, 10);
    expect(mmPerGridDistanceUnit("mm")).toBe(1);
    expect(mmPerGridDistanceUnit("cm")).toBe(10);
    expect(mmPerGridDistanceUnit("m")).toBe(1000);
  });

  it("throws rather than returning a plausible default", () => {
    expect(() => mmPerGridDistanceUnit(undefined)).toThrow(
      UnknownGridUnitError
    );
    expect(() => mmPerGridDistanceUnit("parsecs")).toThrow(
      UnknownGridUnitError
    );
  });
});

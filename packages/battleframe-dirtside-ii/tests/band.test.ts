import { describe, expect, it } from "vitest";
import { bandStep, type Bands } from "../src/combat/band";

/**
 * A2 — range banding. Band distances are USER-entered (no GZG numbers here):
 * close is the max close-range distance, medium the max medium, long the max
 * long. The step feeds the firer die shift: close → one die UP (+1), medium →
 * unchanged (0), long → one die DOWN (-1). Beyond long → null = out of range.
 */
const banded: Bands = { close: 6, medium: 12, long: 24, flatMax: 0 };

describe("bandStep — range → die-shift step", () => {
  it("close range shifts the firer die up (+1)", () => {
    expect(bandStep(1, banded)).toBe(1);
    expect(bandStep(6, banded)).toBe(1);
  });

  it("medium range leaves the firer die unchanged (0)", () => {
    expect(bandStep(7, banded)).toBe(0);
    expect(bandStep(12, banded)).toBe(0);
  });

  it("long range shifts the firer die down (-1)", () => {
    expect(bandStep(13, banded)).toBe(-1);
    expect(bandStep(24, banded)).toBe(-1);
  });

  it("beyond long range is out of range (null)", () => {
    expect(bandStep(25, banded)).toBeNull();
  });

  it("a flat-range weapon never bands: 0 within flatMax, null beyond", () => {
    const flat: Bands = { close: 0, medium: 0, long: 0, flatMax: 18 };
    expect(bandStep(1, flat)).toBe(0);
    expect(bandStep(18, flat)).toBe(0);
    expect(bandStep(19, flat)).toBeNull();
  });
});

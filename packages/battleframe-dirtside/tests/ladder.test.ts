import { describe, expect, it } from "vitest";
import { shift, type DieType } from "../src/dice/ladder";

/**
 * Tier-0 shared atom (§6). LOCKED cross-module contract: MUST match Stargrunt's
 * `src/dice/ladder.ts` byte-for-byte. `null` off EITHER end, no clamping —
 * clamp-vs-impossible is a caller decision.
 */
describe("shift — the symmetric die ladder", () => {
  it("steps up one rung", () => {
    expect(shift("d6", 1)).toBe("d8");
    expect(shift("d4", 1)).toBe("d6");
    expect(shift("d10", 1)).toBe("d12");
  });

  it("steps down one rung", () => {
    expect(shift("d8", -1)).toBe("d6");
    expect(shift("d12", -1)).toBe("d10");
    expect(shift("d6", -1)).toBe("d4");
  });

  it("steps multiple rungs", () => {
    expect(shift("d4", 4)).toBe("d12");
    expect(shift("d12", -4)).toBe("d4");
    expect(shift("d6", 2)).toBe("d10");
  });

  it("returns the same die for a zero step", () => {
    expect(shift("d8", 0)).toBe("d8");
  });

  it("returns null off the BOTTOM of the ladder (no clamping)", () => {
    expect(shift("d4", -1)).toBeNull();
    expect(shift("d6", -2)).toBeNull();
    expect(shift("d4", -5)).toBeNull();
  });

  it("returns null off the TOP of the ladder (no clamping)", () => {
    expect(shift("d12", 1)).toBeNull();
    expect(shift("d10", 2)).toBeNull();
    expect(shift("d12", 5)).toBeNull();
  });

  it("accepts every rung as a DieType", () => {
    const rungs: DieType[] = ["d4", "d6", "d8", "d10", "d12"];
    expect(rungs.map((d) => shift(d, 0))).toEqual(rungs);
  });
});

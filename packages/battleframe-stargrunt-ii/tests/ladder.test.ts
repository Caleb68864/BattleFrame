import { describe, expect, it } from "vitest";
import { shift, opposedShift, type DieType } from "../src/dice/ladder";

/**
 * A1 — the Tier-0 die-ladder shift atom. LOCKED cross-module contract (identical
 * to the Dirtside module, byte-for-byte). Signature is ruleset-free.
 */
describe("shift — the die-ladder atom", () => {
  it("shifts up the ladder by N steps", () => {
    expect(shift("d8", 1)).toBe("d10");
    expect(shift("d8", 2)).toBe("d12");
    expect(shift("d4", 4)).toBe("d12");
  });

  it("shifts down the ladder by N steps", () => {
    expect(shift("d12", -1)).toBe("d10");
    expect(shift("d10", -3)).toBe("d4");
  });

  it("returns the same die for a zero shift", () => {
    for (const die of ["d4", "d6", "d8", "d10", "d12"] as DieType[]) {
      expect(shift(die, 0)).toBe(die);
    }
  });

  it("returns null off the bottom end (no clamping)", () => {
    expect(shift("d4", -1)).toBeNull();
    expect(shift("d6", -3)).toBeNull();
  });

  it("returns null off the top end (symmetric, no clamping)", () => {
    expect(shift("d12", 1)).toBeNull();
    expect(shift("d8", 5)).toBeNull();
  });
});

/**
 * A2 — opposedShift (SG2-side; composes the Tier-0 shift atom). An open shift:
 * overflow past an end of the ladder is re-expressed as an equal-and-opposite
 * shift applied to the opponent's die, with the actor pinned at the cap it hit.
 *
 * NOTE (design finding, docs/decisions.md): the build plan's worked example is
 * internally inconsistent about the transfer ratio (it states both "-2" and a
 * "d6" result for the same case). This implementation uses the clean, neutral
 * 1:1 transfer — one rung of overflow becomes one rung of opposite shift on the
 * opponent. The exact rulebook ratio must be reconciled against the GZG worked
 * example before Impact-vs-Armour/close-combat consume it (both are post-MVP).
 */
describe("opposedShift — open shift overflow onto the opponent", () => {
  it("leaves the opponent untouched when the actor shift stays on the ladder", () => {
    expect(opposedShift("d8", 1, "d8")).toEqual({ actor: "d10", opponent: "d8" });
    expect(opposedShift("d10", -2, "d6")).toEqual({ actor: "d6", opponent: "d6" });
  });

  it("transfers top-end overflow as a downward shift on the opponent (1:1)", () => {
    // actor d12 + 2: 2 rungs overflow the top -> actor pinned d12, opponent -2.
    expect(opposedShift("d12", 2, "d8")).toEqual({ actor: "d12", opponent: "d4" });
  });

  it("transfers bottom-end overflow as an upward shift on the opponent (1:1)", () => {
    // actor d4 - 2: 2 rungs overflow the bottom -> actor pinned d4, opponent +2.
    expect(opposedShift("d4", -2, "d8")).toEqual({ actor: "d4", opponent: "d12" });
  });

  it("clamps the opponent at the cap when the transferred shift re-overflows", () => {
    // 3 rungs of downward transfer onto d6 would step off the bottom; clamp d4.
    expect(opposedShift("d12", 3, "d6")).toEqual({ actor: "d12", opponent: "d4" });
  });
});

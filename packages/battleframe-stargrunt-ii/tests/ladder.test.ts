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
 * RECONCILED against the rulebook (SG2 Ch.2, "Closed vs. open shifts", p5-6): the
 * transfer is 1:1 — "excess shifts beyond D12 (or below D4) are applied as opposite
 * shifts to the opponent's die." The canonical worked example pins it below. (The
 * build plan's worked example had a typo — "d6" where the 1:1 rule gives d4 — the
 * IMPLEMENTATION was already correct; see docs/decisions.md.)
 */
describe("opposedShift — open shift overflow onto the opponent", () => {
  it("matches the rulebook's canonical open-shift example (SG2 Ch.2 p6)", () => {
    // Armour D8, +3 shifts (hard cover + in position) vs Impact D10:
    // "D8 -> D12 caps; the leftover (1) shift drops the firer's Impact die D10 -> D8."
    expect(opposedShift("d8", 3, "d10")).toEqual({ actor: "d12", opponent: "d8" });
  });

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

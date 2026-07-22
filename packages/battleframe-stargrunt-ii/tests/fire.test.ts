import { describe, expect, it } from "vitest";
import {
  beatsAgainst,
  fireTier,
  potentialHits,
  extraHitFromRemainder,
  computeFirepowerDie,
  resolveDispersedFire,
  type DiceApiLike
} from "../src/combat/fire";
import type { Figure } from "../src/combat/casualties";

/** B1 — count firer faces strictly exceeding the single Range-Die face. */
describe("beatsAgainst", () => {
  it("counts strict exceedances only (a tie is not a beat)", () => {
    expect(beatsAgainst([5, 3, 7], 5)).toBe(1);
    expect(beatsAgainst([8, 9, 10], 5)).toBe(3);
    expect(beatsAgainst([1, 2, 3], 5)).toBe(0);
  });
});

/** B2 — beats -> fire tier. */
describe("fireTier", () => {
  it("maps beat count to a tier", () => {
    expect(fireTier(0)).toBe("miss");
    expect(fireTier(1)).toBe("suppress");
    expect(fireTier(2)).toBe("effective");
    expect(fireTier(5)).toBe("effective");
  });
});

/** B3 — potential hits: sum of ALL firer faces divided by the Range-Die TYPE. */
describe("potentialHits", () => {
  it("divides the full firer sum by the die-type number (losers included)", () => {
    expect(potentialHits(19, 6)).toEqual({ whole: 3, remainder: 1 });
    expect(potentialHits(24, 8)).toEqual({ whole: 3, remainder: 0 });
    expect(potentialHits(5, 10)).toEqual({ whole: 0, remainder: 5 });
  });
});

/** B4 — the remainder buys one extra hit iff a re-rolled Range Die comes in under it. */
describe("extraHitFromRemainder", () => {
  it("lands iff the range-die roll is <= the remainder", () => {
    expect(extraHitFromRemainder(4, 3)).toBe(true);
    expect(extraHitFromRemainder(4, 4)).toBe(true);
    expect(extraHitFromRemainder(4, 5)).toBe(false);
  });

  it("is never true when the remainder is zero", () => {
    expect(extraHitFromRemainder(0, 1)).toBe(false);
  });
});

/** B7 — Firepower die = FP x figures, rounded UP the die ladder, capped d12. */
describe("computeFirepowerDie", () => {
  it("rounds the FP product up to the nearest die type", () => {
    expect(computeFirepowerDie(1, 1)).toBe("d4"); // 1 -> d4
    expect(computeFirepowerDie(1, 4)).toBe("d4"); // 4 -> d4
    expect(computeFirepowerDie(1, 5)).toBe("d6"); // 5 -> d6
    expect(computeFirepowerDie(2, 3)).toBe("d6"); // 6 -> d6
    expect(computeFirepowerDie(1, 7)).toBe("d8"); // 7 -> d8
    expect(computeFirepowerDie(2, 5)).toBe("d10"); // 10 -> d10
    expect(computeFirepowerDie(3, 4)).toBe("d12"); // 12 -> d12
  });

  it("caps at d12", () => {
    expect(computeFirepowerDie(5, 5)).toBe("d12"); // 25 -> d12
  });
});

/** A dice mock returning queued totals from `roll`, in order. */
function scriptedDice(totals: number[]): DiceApiLike {
  let i = 0;
  return {
    async roll() {
      const t = totals[Math.min(i, totals.length - 1)];
      i += 1;
      return { total: t };
    },
    async rollPool(count) {
      return Array.from({ length: count }, () => totals[Math.min(i++, totals.length - 1)]);
    }
  };
}

function figures(): Figure[] {
  return [
    { name: "A", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
    { name: "B", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
    { name: "C", armour: "d4", weaponId: "", wounds: 0, status: "ok" }
  ];
}

/**
 * B9 — one dispersed-fire action composing B1-B8, with dice and rng injected.
 */
describe("resolveDispersedFire", () => {
  it("is a miss with zero beats and lays no suppression", async () => {
    // firer quality+FP = [3, 2]; range die = 8. No face beats 8.
    const dice = scriptedDice([3, 2, 8]);
    const out = await resolveDispersedFire({
      dice,
      firerQualityDie: "d10",
      firepowerDie: "d6",
      impactDie: "d8",
      rangeDie: "d8",
      targetArmourDie: "d4",
      targetFigures: figures(),
      rng: () => 0
    });
    expect(out.tier).toBe("miss");
    expect(out.hits).toBe(0);
    expect(out.suppressionApplied).toBe(false);
  });

  it("lays suppression on a single-beat suppress result with no casualties", async () => {
    // firer [9, 2]; range 8 -> one beat (9 > 8). Tier suppress.
    const dice = scriptedDice([9, 2, 8]);
    const out = await resolveDispersedFire({
      dice,
      firerQualityDie: "d10",
      firepowerDie: "d6",
      impactDie: "d8",
      rangeDie: "d8",
      targetArmourDie: "d4",
      targetFigures: figures(),
      rng: () => 0
    });
    expect(out.tier).toBe("suppress");
    expect(out.hits).toBe(0);
    expect(out.suppressionApplied).toBe(true);
    expect(out.figures.every((f) => f.status === "ok")).toBe(true);
  });

  it("resolves effective fire into hits, impacts, and allocated casualties", async () => {
    // firer quality [10] + FP [9] both beat the range face 4 -> 2 beats = effective.
    // sum = 19, range-die type = 4 -> potentialHits { whole: 4, remainder: 3 }.
    // extra-hit range reroll = 4 (<= 3? no) -> no extra hit. hits = 4.
    // Then 4 impact rolls (all 5) vs armour rolls (all 1): 5 > 2*1 -> kill each.
    // rng always 0 -> hits pile onto the shrinking living pool, wiping the unit.
    const dice = scriptedDice([
      10, // quality
      9, // FP
      4, // range die (target)
      4, // extra-hit reroll
      5, 1, 5, 1, 5, 1, 5, 1 // impact/armour pairs
    ]);
    const out = await resolveDispersedFire({
      dice,
      firerQualityDie: "d12",
      firepowerDie: "d10",
      impactDie: "d8",
      rangeDie: "d4",
      targetArmourDie: "d4",
      targetFigures: figures(),
      rng: () => 0
    });
    expect(out.tier).toBe("effective");
    expect(out.beats).toBe(2);
    expect(out.sum).toBe(19);
    expect(out.potentialHits).toBe(4);
    expect(out.remainder).toBe(3);
    expect(out.extraHit).toBe(false);
    expect(out.hits).toBe(4);
    expect(out.suppressionApplied).toBe(true);
    expect(out.wiped).toBe(true);
  });
});

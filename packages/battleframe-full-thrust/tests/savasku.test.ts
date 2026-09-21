import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  powerPoolTotal,
  driveThrustCost,
  ftlJumpCost,
  screenNodeMass,
  stingerPowerPerDie,
  stingerDiceForPower,
  lancePodToHit,
  applyLancePodHit,
  systemRepairCost,
  systemRepairSucceeds,
  droneGrowthCost,
  biomassRemaining,
  consumeBiomass,
  leechPodClears
} from "../src/combat/savasku";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


// All numbers hand-computed from the user's notes:
//   Factions & Ships/Xeno/Sa'Vasku.md,
//   Factions & Ships/Xeno/Sa'Vasku Power Points.md,
//   Factions & Ships/Xeno/Sa'Vasku Systems.md.

describe("powerPoolTotal (sum of still-functioning Power Generators, value = MASS)", () => {
  // Note: "total power each turn is the sum of its still-functioning Power
  // Generators (each generator's value = its MASS; 1 MASS = 1 point)."
  it("sums the MASS of every functioning generator", () => {
    expect(powerPoolTotal([12, 8, 6])).toBe(26);
    expect(powerPoolTotal([10])).toBe(10);
  });
  it("is zero when every generator is gone (all power lost)", () => {
    expect(powerPoolTotal([])).toBe(0);
  });
});

describe("driveThrustCost (Movement pool: 2% x thrust x ship MASS, rounded up; damaged x2)", () => {
  // Note: "Thrust cost = 2% x thrust x ship MASS (rounded up); a damaged drive
  // costs double (4%)."
  it("charges 2% x thrust x mass, rounded up", () => {
    expect(driveThrustCost(4, 100)).toBe(8); // 0.02*4*100 = 8
    expect(driveThrustCost(6, 50)).toBe(6); // 0.02*6*50 = 6
    expect(driveThrustCost(3, 55)).toBe(4); // 0.02*3*55 = 3.3 -> 4
  });
  it("doubles the cost for a damaged drive (the 4% case)", () => {
    expect(driveThrustCost(4, 100, true)).toBe(16);
    expect(driveThrustCost(3, 55, true)).toBe(7); // 0.04*3*55 = 6.6 -> 7
  });
  it("is zero for zero thrust", () => {
    expect(driveThrustCost(0, 100)).toBe(0);
  });
});

describe("ftlJumpCost (Movement pool: points equal to FTL node MASS)", () => {
  // Note: "FTL jump = points equal to FTL node MASS."
  it("equals the FTL node MASS", () => {
    expect(ftlJumpCost(10)).toBe(10);
    expect(ftlJumpCost(3)).toBe(3);
  });
});

describe("screenNodeMass (Defence pool: node MASS = 5% ship MASS, min 3 MASS)", () => {
  // Note: "cost = node MASS = 5% ship MASS, min 3 MASS".
  it("is 5% of ship MASS, rounded up", () => {
    expect(screenNodeMass(100)).toBe(5); // 5% of 100
    expect(screenNodeMass(61)).toBe(4); // 3.05 -> 4
  });
  it("never drops below the 3-MASS floor", () => {
    expect(screenNodeMass(40)).toBe(3); // 5% = 2 -> floor 3
    expect(screenNodeMass(10)).toBe(3);
  });
});

describe("stingerPowerPerDie (power per hit-die by 12mu band, doubling to 72mu)", () => {
  // Note: "Power per hit-die by range: 0-12mu 1 PP, 12-24 2, 24-36 4, 36-48 8,
  // 48-60 16, 60-72 32 (doubling each band)."
  it("doubles each 12mu band, boundary inclusive at the nearer band", () => {
    expect(stingerPowerPerDie(0)).toBe(1);
    expect(stingerPowerPerDie(12)).toBe(1);
    expect(stingerPowerPerDie(12.1)).toBe(2);
    expect(stingerPowerPerDie(24)).toBe(2);
    expect(stingerPowerPerDie(36)).toBe(4);
    expect(stingerPowerPerDie(48)).toBe(8);
    expect(stingerPowerPerDie(60)).toBe(16);
    expect(stingerPowerPerDie(72)).toBe(32);
  });
  it("is null beyond the 72mu maximum range", () => {
    expect(stingerPowerPerDie(72.1)).toBeNull();
    expect(stingerPowerPerDie(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("stingerDiceForPower (a node turns Attack power into hit-dice at range)", () => {
  // "One node handles any amount of power" -> dice = floor(power / power-per-die).
  it("converts allocated power into hit-dice at close range (1 PP/die)", () => {
    expect(stingerDiceForPower(8, 0)).toBe(8);
    expect(stingerDiceForPower(5, 12)).toBe(5);
  });
  it("needs more power per die at longer range", () => {
    expect(stingerDiceForPower(8, 30)).toBe(2); // 24-36 band = 4 PP/die
    expect(stingerDiceForPower(32, 65)).toBe(1); // 60-72 band = 32 PP/die
    expect(stingerDiceForPower(7, 30)).toBe(1); // floor(7/4)
  });
  it("is zero out of range or with too little power", () => {
    expect(stingerDiceForPower(100, 72.1)).toBe(0);
    expect(stingerDiceForPower(3, 30)).toBe(0); // floor(3/4)
  });
});

describe("lancePodToHit (Pod Launcher: carapace/armour-piercer to-hit by 6mu band)", () => {
  // Note: "Hit 0-6mu 3+, 6-12 4+, 12-18 5+, 18-24 6".
  it("needs 3+/4+/5+/6 by 6mu band, boundary inclusive at the nearer band", () => {
    expect(lancePodToHit(0)).toBe(3);
    expect(lancePodToHit(6)).toBe(3);
    expect(lancePodToHit(6.1)).toBe(4);
    expect(lancePodToHit(12)).toBe(4);
    expect(lancePodToHit(18)).toBe(5);
    expect(lancePodToHit(24)).toBe(6);
  });
  it("is null beyond the 24mu maximum range", () => {
    expect(lancePodToHit(24.1)).toBeNull();
  });
});

describe("applyLancePodHit (damage = the second die face; only first DP on armour)", () => {
  // Note: "damage = second die roll, only the first DP taken on armour, rest to
  // hull. No rerolls." -> identical armour-pierce rule as a class-N K-gun hit.
  it("takes exactly 1 DP on carapace/armour and sends the rest to hull", () => {
    const result = applyLancePodHit({
      armour: { boxes: 3, damage: 0 },
      hull: { boxes: 10, damage: 0, rows: 4 },
      face: 6
    });
    expect(result.armour).toEqual({ boxes: 3, damage: 1 });
    expect(result.hull.damage).toBe(5);
    expect(result.destroyed).toBe(false);
  });
  it("puts the whole hit on the hull when the ship has no carapace", () => {
    const result = applyLancePodHit({
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 10, damage: 0, rows: 4 },
      face: 4
    });
    expect(result.hull.damage).toBe(4);
  });
});

describe("systemRepairCost / systemRepairSucceeds (Repair pool: MASS of system + 4+ roll)", () => {
  // Note: "system-repair attempts (points = MASS of the system, plus a 4+ roll)".
  it("costs the repaired system's MASS", () => {
    expect(systemRepairCost(6)).toBe(6);
    expect(systemRepairCost(3)).toBe(3);
  });
  it("succeeds on a 4 or higher", () => {
    expect(systemRepairSucceeds(3)).toBe(false);
    expect(systemRepairSucceeds(4)).toBe(true);
    expect(systemRepairSucceeds(6)).toBe(true);
  });
});

describe("droneGrowthCost (Repair pool: 1 biomass + 1 R-point per drone, 6 per group)", () => {
  // Note: "1 biomass + 1 R-pool point per drone ... groups of 6".
  it("costs one power point and one biomass per drone", () => {
    expect(droneGrowthCost(6)).toEqual({ power: 6, biomass: 6 });
    expect(droneGrowthCost(3)).toEqual({ power: 3, biomass: 3 });
  });
});

describe("biomassRemaining / consumeBiomass (living-hull damage + self-consumption rule)", () => {
  // Note: "the ship can consume biomass (from the far end) ... consumption never
  // triggers a Threshold Check ... When consumed and damaged boxes meet, the
  // ship is dead."
  it("counts boxes not yet damaged or consumed", () => {
    expect(biomassRemaining({ boxes: 10, damage: 3, consumed: 0 })).toBe(7);
    expect(biomassRemaining({ boxes: 10, damage: 4, consumed: 4 })).toBe(2);
  });
  it("consumes from the far end without a threshold, and reports the amount taken", () => {
    const r = consumeBiomass({ boxes: 10, damage: 3, consumed: 0 }, 5);
    expect(r.consumed).toBe(5);
    expect(r.biomass).toEqual({ boxes: 10, damage: 3, consumed: 5 });
    expect(r.dead).toBe(false); // 3 damaged + 5 consumed = 8 < 10
  });
  it("kills the ship when consumed and damaged boxes meet", () => {
    const r = consumeBiomass({ boxes: 10, damage: 3, consumed: 0 }, 7);
    expect(r.consumed).toBe(7);
    expect(r.dead).toBe(true); // 3 + 7 = 10
  });
  it("cannot consume more than remains", () => {
    const r = consumeBiomass({ boxes: 10, damage: 3, consumed: 0 }, 100);
    expect(r.consumed).toBe(7);
    expect(r.dead).toBe(true);
  });
});

describe("leechPodClears (a Sa'Vasku spends 1-3 R-pool points to kill a leech off)", () => {
  // Note: "killed off (damage-control roll for crewed ships; 1-3 R-pool points
  // for Sa'Vasku)".
  it("clears when 1 to 3 R-pool points are spent", () => {
    expect(leechPodClears(1)).toBe(true);
    expect(leechPodClears(3)).toBe(true);
    expect(leechPodClears(0)).toBe(false);
    expect(leechPodClears(4)).toBe(false);
  });
});

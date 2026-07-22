import { describe, expect, it } from "vitest";
import { resolveWeaponFire, type WeaponMount } from "../src/combat/fire";

/**
 * A scripted dice stand-in: each rollPool call shifts the next array off a
 * queue, so a test controls exactly what every pool rolls.
 */
function scriptedDice(pools: number[][]) {
  const queue = [...pools];
  return {
    rollPool: async (count: number) => {
      const next = queue.shift() ?? [];
      return next.slice(0, count);
    }
  };
}

describe("resolveWeaponFire", () => {
  it("rolls a beam by range band and pools its damage against the target screen", async () => {
    const weapons: WeaponMount[] = [{ kind: "beam", weaponClass: 3, arcs: ["F"] }];
    // Class 3 at 10mu -> 3 dice. Faces 6,4,2 unscreened -> 2+1+0 = 3 damage.
    const dice = scriptedDice([[6, 4, 2]]);

    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 10,
      bearing: 0,
      targetScreenLevel: 0,
      dice
    });

    expect(result.totalDamage).toBe(3);
    expect(result.shots[0].damage).toBe(3);
    expect(result.shots[0].fired).toBe(true);
  });

  it("does not fire a beam that cannot bear on the target's arc", async () => {
    const weapons: WeaponMount[] = [{ kind: "beam", weaponClass: 3, arcs: ["F"] }];
    const dice = scriptedDice([[6, 6, 6]]);

    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 10,
      bearing: 180, // dead astern, weapon only covers F
      targetScreenLevel: 0,
      dice
    });

    expect(result.totalDamage).toBe(0);
    expect(result.shots[0].fired).toBe(false);
    expect(result.shots[0].reason).toBe("out-of-arc");
  });

  it("does not fire a beam out of range", async () => {
    const weapons: WeaponMount[] = [{ kind: "beam", weaponClass: 1, arcs: ["F"] }];
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 13, // class 1 reaches only 12mu
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[6]])
    });
    expect(result.shots[0].fired).toBe(false);
    expect(result.shots[0].reason).toBe("out-of-range");
  });

  it("applies the target's screen level to beam damage", async () => {
    const weapons: WeaponMount[] = [{ kind: "beam", weaponClass: 2, arcs: ["F"] }];
    // 2 dice: 4,6. Level-1 screen ignores the 4 -> 0 + 2 = 2.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 6,
      bearing: 0,
      targetScreenLevel: 1,
      dice: scriptedDice([[4, 6]])
    });
    expect(result.totalDamage).toBe(2);
  });

  it("resolves a pulse torpedo: roll to hit, then a damage die (ignores screens)", async () => {
    const weapons: WeaponMount[] = [{ kind: "torpedo", arcs: ["F"] }];
    // At 10mu -> 3+ to hit. First pool = to-hit die (5 = hit); second = damage die (4).
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 10,
      bearing: 0,
      targetScreenLevel: 3, // screens do not reduce torpedoes
      dice: scriptedDice([[5], [4]])
    });
    expect(result.totalDamage).toBe(4);
    expect(result.shots[0].fired).toBe(true);
  });

  it("a torpedo that misses does no damage and rolls no damage die", async () => {
    const weapons: WeaponMount[] = [{ kind: "torpedo", arcs: ["F"] }];
    // At 30mu -> needs a 6. Rolls a 5 -> miss.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 30,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[5]])
    });
    expect(result.totalDamage).toBe(0);
    expect(result.shots[0].fired).toBe(true);
    expect(result.shots[0].damage).toBe(0);
  });

  it("resolves a submunition pack (dice by band, ignores screens) and marks it spent", async () => {
    const weapons: WeaponMount[] = [{ kind: "submunition", arcs: ["F"] }];
    // At 5mu -> 3 dice; 6,5,4 ignoring screens -> 2+1+1 = 4.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 5,
      bearing: 0,
      targetScreenLevel: 2,
      dice: scriptedDice([[6, 5, 4]])
    });
    expect(result.totalDamage).toBe(4);
    expect(result.spent).toEqual([0]);
  });

  it("skips destroyed and already-spent weapons", async () => {
    const weapons: WeaponMount[] = [
      { kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: true },
      { kind: "submunition", arcs: ["F"], spent: true }
    ];
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 5,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[6, 6, 6], [6, 6, 6]])
    });
    expect(result.totalDamage).toBe(0);
    expect(result.shots[0].reason).toBe("destroyed");
    expect(result.shots[1].reason).toBe("spent");
  });

  it("sums damage across several weapons firing at one target", async () => {
    const weapons: WeaponMount[] = [
      { kind: "beam", weaponClass: 2, arcs: ["F"] },
      { kind: "beam", weaponClass: 1, arcs: ["F"] }
    ];
    // Cl2 at 6mu: 2 dice 6,4 -> 3. Cl1 at 6mu: 1 die 6 -> 2. Total 5.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 6,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[6, 4], [6]])
    });
    expect(result.totalDamage).toBe(5);
  });
});

describe("resolveWeaponFire — Kra'Vak K-gun (kinetic, armour-piercing)", () => {
  it("rolls one to-hit die by 6mu band, then a penetration die for damage", async () => {
    const weapons: WeaponMount[] = [{ kind: "kgun", weaponClass: 3, arcs: ["F"] }];
    // At 10mu -> 3+ to hit. To-hit die 5 (hit); penetration die 2 -> class-3 does
    // 6 DP (roll <= class doubles). The pierced hit is carried in `piercingHits`,
    // NOT the armour-eligible `totalDamage` pool.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 10,
      bearing: 0,
      targetScreenLevel: 3, // kinetic: screens do not apply
      dice: scriptedDice([[5], [2]])
    });
    expect(result.totalDamage).toBe(0);
    expect(result.piercingHits).toEqual([6]);
    expect(result.shots[0].fired).toBe(true);
    expect(result.shots[0].damage).toBe(6);
    expect(result.shots[0].faces).toEqual([5, 2]);
  });

  it("uses the penetration die per the class table (roll>class = class DP)", async () => {
    const weapons: WeaponMount[] = [{ kind: "kgun", weaponClass: 3, arcs: ["F"] }];
    // To-hit 6 (hit at any band); penetration 5 -> class-3 does 3 DP (roll>class).
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 28, // 24-30 band needs 6
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[6], [5]])
    });
    expect(result.piercingHits).toEqual([3]);
  });

  it("a K-gun that misses rolls no penetration die and adds no hit", async () => {
    const weapons: WeaponMount[] = [{ kind: "kgun", weaponClass: 5, arcs: ["F"] }];
    // At 28mu -> needs 6; rolls 5 -> miss. No penetration pool is consumed.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 28,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[5], [1]])
    });
    expect(result.piercingHits).toEqual([]);
    expect(result.totalDamage).toBe(0);
    expect(result.shots[0].fired).toBe(true);
    expect(result.shots[0].damage).toBe(0);
  });

  it("does not fire a K-gun beyond its 30mu maximum range", async () => {
    const weapons: WeaponMount[] = [{ kind: "kgun", weaponClass: 3, arcs: ["F"] }];
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 31,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[6], [1]])
    });
    expect(result.shots[0].fired).toBe(false);
    expect(result.shots[0].reason).toBe("out-of-range");
    expect(result.piercingHits).toEqual([]);
  });

  it("does not fire a K-gun that cannot bear on the target's arc", async () => {
    const weapons: WeaponMount[] = [{ kind: "kgun", weaponClass: 3, arcs: ["F"] }];
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 6,
      bearing: 180,
      targetScreenLevel: 0,
      dice: scriptedDice([[6], [1]])
    });
    expect(result.shots[0].reason).toBe("out-of-arc");
    expect(result.piercingHits).toEqual([]);
  });

  it("keeps every hit separate (per-hit pierce), never pre-summed", async () => {
    const weapons: WeaponMount[] = [
      { kind: "kgun", weaponClass: 3, arcs: ["F"] },
      { kind: "kgun", weaponClass: 5, arcs: ["F"] }
    ];
    // K-3: to-hit 4 (hit), pen 1 -> 6 DP. K-5: to-hit 4 (hit), pen 6 -> natural 6 = class = 5 DP.
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 6,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[4], [1], [4], [6]])
    });
    expect(result.piercingHits).toEqual([6, 5]);
    expect(result.totalDamage).toBe(0);
  });

  it("leaves the armour-eligible beam pool untouched when mixed with a K-gun", async () => {
    const weapons: WeaponMount[] = [
      { kind: "beam", weaponClass: 2, arcs: ["F"] },
      { kind: "kgun", weaponClass: 3, arcs: ["F"] }
    ];
    // Beam cl2 at 6mu: 2 dice 6,4 -> 3 (armour-eligible). K-gun: to-hit 6, pen 2 -> 6 DP (piercing).
    const result = await resolveWeaponFire({
      weapons,
      distanceMu: 6,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scriptedDice([[6, 4], [6], [2]])
    });
    expect(result.totalDamage).toBe(3);
    expect(result.piercingHits).toEqual([6]);
  });

  it("default (penetrating off) scores a beam 6 as the FT2 '6 = 2, done'", async () => {
    const weapons: WeaponMount[] = [{ kind: "beam", weaponClass: 1, arcs: ["F"] }];
    const result = await resolveWeaponFire({
      weapons, distanceMu: 3, bearing: 0, targetScreenLevel: 0, dice: scriptedDice([[6]])
    });
    expect(result.totalDamage).toBe(2);
  });

  it("Fleet Book penetrating: a beam 6 scores 2 AND rerolls, chaining (6->6->3 = 4)", async () => {
    const weapons: WeaponMount[] = [{ kind: "beam", weaponClass: 1, arcs: ["F"] }];
    // initial [6] -> reroll [6] -> reroll [3]. poolPenetratingDamage = 2 + 2 + 0 = 4.
    const result = await resolveWeaponFire({
      weapons, distanceMu: 3, bearing: 0, targetScreenLevel: 0, penetrating: true,
      dice: scriptedDice([[6], [6], [3]])
    });
    expect(result.totalDamage).toBe(4);
  });
});

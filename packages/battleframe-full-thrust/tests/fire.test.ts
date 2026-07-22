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

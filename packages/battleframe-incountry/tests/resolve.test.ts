import { describe, expect, it } from "vitest";
import {
  attackTotal,
  countHits,
  damageFrom,
  survivesArmor,
  resolveAttack,
  type DiceApiLike
} from "../src/combat/resolve";

/**
 * INX to-hit is ROLL-UNDER on a d10: each die face <= the Attack Value is a
 * hit, and the damage total is the SUM of the hitting faces (not the count),
 * plus the weapon's DMG. Armor rolls d10 + modifier and survives on strictly
 * greater than damage. (Rulebook D.1, H.1-H.3.)
 */

describe("countHits — roll-under d10", () => {
  it("counts faces at or below the attack value", () => {
    // faces 1,4,10 vs attack value 7 -> 1 and 4 hit, 10 misses.
    expect(countHits([1, 4, 10], 7)).toBe(2);
  });

  it("a face equal to the value hits", () => {
    expect(countHits([7], 7)).toBe(1);
  });

  it("no dice means no hits", () => {
    expect(countHits([], 7)).toBe(0);
  });
});

describe("attackTotal — sum of hitting faces", () => {
  it("sums only the faces that hit", () => {
    // 1,4 hit -> 5; 10 misses. (Rulebook worked example.)
    expect(attackTotal([1, 4, 10], 7)).toBe(5);
  });

  it("is zero when nothing hits", () => {
    expect(attackTotal([9, 10], 7)).toBe(0);
  });
});

describe("damageFrom — total + weapon DMG, only on a hit", () => {
  it("adds weapon DMG when at least one hit landed", () => {
    expect(damageFrom(5, 2, 2)).toBe(7);
  });

  it("is zero when there were no hits, regardless of DMG", () => {
    expect(damageFrom(0, 5, 0)).toBe(0);
  });
});

describe("survivesArmor — strict greater-than, ties destroy", () => {
  it("survives when armor total exceeds damage", () => {
    // unarmored +4: roll 4 -> 8 > 7 -> survive.
    expect(survivesArmor([4], 4, 7)).toBe(true);
  });

  it("is destroyed when the armor total ties the damage", () => {
    // +4: roll 3 -> 7, damage 7 -> tie -> destroyed.
    expect(survivesArmor([3], 4, 7)).toBe(false);
  });

  it("is destroyed when armor falls short", () => {
    expect(survivesArmor([1], 4, 7)).toBe(false);
  });

  it("sums multiple armor dice", () => {
    expect(survivesArmor([2, 3], 0, 4)).toBe(true); // 5 > 4
  });
});

/** A deterministic dice stub: returns queued faces in order, one per 1d10. */
function fakeDice(faces: number[]): DiceApiLike & { rolled: string[] } {
  const queue = [...faces];
  const rolled: string[] = [];
  return {
    rolled,
    async roll(formula: string) {
      rolled.push(formula);
      const value = queue.shift();
      if (value === undefined) {
        throw new Error("fakeDice ran out of faces");
      }
      return { total: value };
    },
    async rollPool(count: number, dieSize: number) {
      if (count <= 0) {
        return [];
      }
      rolled.push(`${count}d${dieSize}`);
      const out = queue.splice(0, count);
      if (out.length < count) {
        throw new Error("fakeDice ran out of faces");
      }
      return out;
    }
  };
}

describe("resolveAttack — full attack against one target model", () => {
  it("rolls to hit, sums hits + DMG, then one armor check; destroys on a tie", async () => {
    // Attack 2d10 vs value 7: faces 4,6 both hit -> total 10; +DMG 2 -> damage 12.
    // Armor unarmored +4: roll 5 -> 9 <= 12 -> destroyed.
    const dice = fakeDice([4, 6, 5]);
    const result = await resolveAttack({
      dice,
      attackDice: 2,
      attackValue: 7,
      weaponDmg: 2,
      armorDice: 1,
      armorModifier: 4
    });

    expect(result.attackerFaces).toEqual([4, 6]);
    expect(result.hits).toBe(2);
    expect(result.attackTotal).toBe(10);
    expect(result.damage).toBe(12);
    expect(result.armorFaces).toEqual([5]);
    expect(result.armorTotal).toBe(9);
    expect(result.destroyed).toBe(true);
  });

  it("skips the armor check entirely when nothing hits", async () => {
    const dice = fakeDice([9, 10]); // both miss vs value 7
    const result = await resolveAttack({
      dice,
      attackDice: 2,
      attackValue: 7,
      weaponDmg: 3,
      armorDice: 1,
      armorModifier: 4
    });

    expect(result.hits).toBe(0);
    expect(result.damage).toBe(0);
    expect(result.armorFaces).toEqual([]);
    expect(result.destroyed).toBe(false);
    // One pool roll for the two attack dice; no armor pool (nothing hit).
    expect(dice.rolled).toEqual(["2d10"]);
  });

  it("rolls zero attack dice as an automatic miss (0D10 weapons)", async () => {
    const dice = fakeDice([]);
    const result = await resolveAttack({
      dice,
      attackDice: 0,
      attackValue: 7,
      weaponDmg: 5,
      armorDice: 1,
      armorModifier: 4
    });

    expect(result.hits).toBe(0);
    expect(result.destroyed).toBe(false);
    expect(dice.rolled).toEqual([]);
  });
});

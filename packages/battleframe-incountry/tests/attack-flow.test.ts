import { describe, expect, it } from "vitest";
import { resolveUnitAttack } from "../src/round/attack-flow";
import type { DiceApiLike } from "../src/combat/resolve";
import type { UnitSystemData, WeaponProfile } from "../src/data/unit-state";

function fakeDice(faces: number[]): DiceApiLike {
  const queue = [...faces];
  return {
    async roll() {
      const value = queue.shift();
      if (value === undefined) {
        throw new Error("fakeDice ran out of faces");
      }
      return { total: value };
    }
  };
}

function weapon(extra: Partial<WeaponProfile> = {}): WeaponProfile {
  return { name: "Rifle", count: 1, dmg: 2, attackDice: 2, owDice: 1, ...extra };
}

function unit(extra: Partial<UnitSystemData> = {}): UnitSystemData {
  return {
    modelCount: 4,
    modelsRemaining: 4,
    move: 6,
    morale: 6,
    attackClear: 7,
    attackCover: 5,
    armorType: "unarmored",
    suppressed: false,
    weapons: [weapon()],
    ...extra
  };
}

describe("resolveUnitAttack — attack, casualty, suppression", () => {
  it("kills a model and rolls suppression against surviving morale", async () => {
    // Attack 2d10 vs clear 7: faces 4,6 hit -> total 10; +DMG 2 -> 12.
    // Armor unarmored +4: roll 5 -> 9 <= 12 -> a model dies.
    // Suppression d10: roll 8 > morale 6 -> suppressed.
    const dice = fakeDice([4, 6, 5, 8]);
    const result = await resolveUnitAttack({
      dice,
      attacker: unit(),
      weapon: weapon(),
      target: unit({ modelsRemaining: 4, morale: 6 }),
      inCover: false
    });

    expect(result.attack.destroyed).toBe(true);
    expect(result.targetModelsAfter).toBe(3);
    expect(result.targetDestroyed).toBe(false);
    expect(result.suppressionRoll).toBe(8);
    expect(result.suppressed).toBe(true);
  });

  it("uses the cover Attack Value when the target is in cover", async () => {
    // In cover -> value 5. Faces 6,7 both MISS (6>5, 7>5) -> no hit, no armor.
    const dice = fakeDice([6, 7]);
    const result = await resolveUnitAttack({
      dice,
      attacker: unit(),
      weapon: weapon(),
      target: unit(),
      inCover: true
    });

    expect(result.attack.hits).toBe(0);
    expect(result.targetModelsAfter).toBe(4);
    expect(result.suppressed).toBe(false);
    expect(result.suppressionRoll).toBeUndefined();
  });

  it("does not roll suppression when the last model is killed (unit wiped)", async () => {
    // Target at 1 model. Attack hits and kills -> wiped, no suppression check.
    const dice = fakeDice([3, 3, 4]); // 3,3 hit vs 7 -> total 6 +2 = 8; armor 4 -> 8 <=8 dies
    const result = await resolveUnitAttack({
      dice,
      attacker: unit(),
      weapon: weapon(),
      target: unit({ modelsRemaining: 1, morale: 6 }),
      inCover: false
    });

    expect(result.targetModelsAfter).toBe(0);
    expect(result.targetDestroyed).toBe(true);
    expect(result.suppressed).toBe(false);
    expect(result.suppressionRoll).toBeUndefined();
  });
});

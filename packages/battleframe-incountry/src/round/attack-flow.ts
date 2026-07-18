import { ARMOR_DICE_DEFAULT, INX_DIE_SIZE, MODULE_ID } from "../constants";
import { resolveAttack, type AttackResult, type DiceApiLike } from "../combat/resolve";
import { armorModifier, attackValue, type UnitSystemData, type WeaponProfile } from "../data/unit-state";
import { rollSuppresses } from "./suppression";

/**
 * One unit's attack against a target unit: resolves the attack with the
 * cover-aware Attack Value and the target's armor tier, removes a model on a
 * destroy, then -- if a model died and the unit is not wiped -- rolls the
 * suppression check against the target's morale. A wiped unit is not suppressed
 * (there is nothing left to suppress).
 *
 * All rolls run through the injected dice API, so the whole flow is
 * deterministic under test and animates live.
 */

export interface AttackFlowParams {
  dice: DiceApiLike;
  attacker: Pick<UnitSystemData, "attackClear" | "attackCover">;
  weapon: Pick<WeaponProfile, "attackDice" | "dmg">;
  target: Pick<UnitSystemData, "modelsRemaining" | "armorType" | "morale">;
  inCover: boolean;
  flavorPrefix?: string;
}

export interface AttackFlowResult {
  attack: AttackResult;
  targetModelsAfter: number;
  targetDestroyed: boolean;
  /** The suppression d10, present only when a model died and survivors remain. */
  suppressionRoll?: number;
  suppressed: boolean;
}

export async function resolveUnitAttack(params: AttackFlowParams): Promise<AttackFlowResult> {
  const { dice, attacker, weapon, target, inCover } = params;

  const attack = await resolveAttack({
    dice,
    attackDice: weapon.attackDice,
    attackValue: attackValue(attacker, inCover),
    weaponDmg: weapon.dmg,
    armorDice: ARMOR_DICE_DEFAULT,
    armorModifier: armorModifier(target),
    flavorPrefix: params.flavorPrefix
  });

  const targetModelsAfter = attack.destroyed
    ? Math.max(0, target.modelsRemaining - 1)
    : target.modelsRemaining;
  const targetDestroyed = targetModelsAfter <= 0;

  // Suppression only when a model died AND the unit still has survivors.
  if (!attack.destroyed || targetDestroyed) {
    return { attack, targetModelsAfter, targetDestroyed, suppressed: false };
  }

  const suppressionRoll = (
    await dice.roll(`1d${INX_DIE_SIZE}`, {}, { rulesetId: MODULE_ID, flavor: "suppression" })
  ).total;
  const suppressed = rollSuppresses(suppressionRoll, target.morale);

  return { attack, targetModelsAfter, targetDestroyed, suppressionRoll, suppressed };
}

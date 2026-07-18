import type { AttackType } from "../constants";
import { applyCasualties, isUnitDestroyed, unitModels, type UnitActorLike } from "../data/unit-state";
import { resolveAttack, type AttackResult, type DiceApiLike } from "./resolve";

/** A unit as an attack sees it: its Actor (stats + models), token, and side. */
export interface AttackUnit {
  id: string;
  playerId: string;
  token: unknown;
  actor: UnitActorLike & { system?: Record<string, unknown> };
}

const ATTACK_FIELD: Readonly<Record<AttackType, string>> = {
  melee: "attackMelee",
  ranged: "attackRanged",
  magic: "attackMagic"
};

function readD6Target(system: Record<string, unknown> | undefined, field: string): number | null {
  const value = system?.[field];
  return typeof value === "number" ? value : null;
}

/** The attacker's target number for a given attack type, or null if it cannot make it. */
export function attackTargetFor(actor: AttackUnit["actor"], type: AttackType): number | null {
  return readD6Target(actor.system, ATTACK_FIELD[type]);
}

/** The defender's Save target, or null (no save -- every hit is a casualty). */
export function saveTargetFor(actor: AttackUnit["actor"]): number | null {
  return readD6Target(actor.system, "save");
}

export interface AttackRefused {
  refused: string;
}

export interface AttackApplied extends AttackResult {
  destroyed: boolean;
}

export type AttackOutcome = AttackRefused | AttackApplied;

export interface PerformAttackParams {
  attacker: AttackUnit;
  defender: AttackUnit;
  type: AttackType;
  dice: DiceApiLike;
  flavorPrefix?: string;
}

/**
 * One unit attacks another: read the attacker's Attack for this type and the
 * defender's Save from their Actors, roll it out (`resolveAttack`), then apply
 * the casualties to the defender's model count. Returns the resolution plus
 * whether the defender was destroyed, or a `refused` reason (the attacker has no
 * stat for this attack type) that never touches a document.
 *
 * Range and turn legality are the caller's to check (the round decides who may
 * attack whom); this is the resolution once an attack is declared.
 */
export async function performAttack(params: PerformAttackParams): Promise<AttackOutcome> {
  const { attacker, defender, type, dice } = params;

  const attackTarget = attackTargetFor(attacker.actor, type);

  if (attackTarget === null) {
    return { refused: `no-${type}-attack` };
  }

  const result = await resolveAttack({
    dice,
    models: unitModels(attacker.actor),
    attackTarget,
    saveTarget: saveTargetFor(defender.actor),
    type,
    flavorPrefix: params.flavorPrefix
  });

  await applyCasualties(defender.actor, result.casualties);

  return { ...result, destroyed: isUnitDestroyed(defender.actor) };
}

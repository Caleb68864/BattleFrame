import { ATTACK_TYPES, DEFAULT_RANGE_INCHES, MODULE_ID, type AttackType } from "../constants";
import { isUnitDestroyed, unitModels } from "../data/unit-state";
import { attackTargetFor, performAttack, type AttackOutcome, type AttackUnit } from "../combat/attack";
import type { DiceApiLike } from "../combat/resolve";
import {
  createSkirmishRound,
  determineFirstPlayer,
  type SkirmishRound
} from "../round/session";
import { checkVictory, type VictoryOutcome } from "../round/victory";

/**
 * The activation control's testable core: everything above the Foundry glue at
 * the bottom of this file is pure and injectable, so a round can be started and
 * played out without a canvas. It composes the pieces the unit tests already
 * cover -- initiative, the round session, `performAttack`, `checkVictory` -- into
 * the flow a GM drives: start a round, then activate a unit and resolve its
 * attack, until every unit has acted and the deathmatch is decided.
 */

export interface RoundControlUnit extends AttackUnit {
  actor: AttackUnit["actor"] & { system?: { move?: number } };
}

export class InitiativeUnresolvedError extends Error {
  constructor(rerolls: number) {
    super(`${MODULE_ID} | initiative stayed tied after ${rerolls} re-rolls`);
    this.name = "InitiativeUnresolvedError";
  }
}

export const MAX_INITIATIVE_REROLLS = 5;

/**
 * Rolls one d6 per player and returns who goes first, re-rolling the whole set
 * on a tie (QSR leaves ties unresolved, so re-rolling is the only honest way to
 * break one -- the same INVENTED HOUSE RULE GREATHELM uses, and it must not be
 * presented to a player as a rulebook rule). Bounded so a pathological run of
 * ties cannot loop forever.
 */
export async function rollInitiative(
  playerIds: readonly string[],
  dice: DiceApiLike,
  maxRerolls: number = MAX_INITIATIVE_REROLLS
): Promise<{ firstPlayerId: string; rerolls: number }> {
  for (let rerolls = 0; rerolls <= maxRerolls; rerolls += 1) {
    const rolls = [];
    for (const playerId of playerIds) {
      const result = await dice.roll("1d6", {}, { rulesetId: MODULE_ID, flavor: `initiative (${playerId})` });
      rolls.push({ playerId, roll: result.total });
    }

    const first = determineFirstPlayer(rolls);
    if (first !== null) {
      return { firstPlayerId: first, rerolls };
    }
  }

  throw new InitiativeUnresolvedError(maxRerolls);
}

export interface BeginRoundParams {
  units: readonly RoundControlUnit[];
  dice: DiceApiLike;
  maxRerolls?: number;
}

export interface BeginRoundResult {
  round: SkirmishRound;
  firstPlayerId: string;
  rerolls: number;
}

/** Rolls initiative and builds a round whose destroyed units drop out live. */
export async function beginRound(params: BeginRoundParams): Promise<BeginRoundResult> {
  const { units, dice } = params;
  const playerIds = distinct(units.map((unit) => unit.playerId));

  const { firstPlayerId, rerolls } = await rollInitiative(playerIds, dice, params.maxRerolls);

  const round = createSkirmishRound(
    units.map((unit) => ({
      id: unit.id,
      playerId: unit.playerId,
      isDestroyed: () => isUnitDestroyed(unit.actor)
    })),
    firstPlayerId
  );

  return { round, firstPlayerId, rerolls };
}

/**
 * The attack types `attacker` may use against a target `distance` inches away:
 * it must have the stat AND the target must be in that type's range. Melee is a
 * charge-in, so its reach is the attacker's Move; Ranged/Magic use the default
 * 12" (per-unit ranges are an Advanced refinement -- see the design doc).
 */
export function legalAttackTypes(attacker: RoundControlUnit, distance: number): AttackType[] {
  const meleeReach = attacker.actor.system?.move ?? 0;

  return ATTACK_TYPES.filter((type) => {
    if (attackTargetFor(attacker.actor, type) === null) {
      return false;
    }

    const reach = type === "melee" ? meleeReach : DEFAULT_RANGE_INCHES;
    return distance <= reach;
  });
}

export class IllegalActivationError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalActivationError";
  }
}

export interface ResolveActivationParams {
  round: SkirmishRound;
  attacker: RoundControlUnit;
  /** The enemy unit to attack, or null for an activation with no attack (move only). */
  target: RoundControlUnit | null;
  type: AttackType | null;
  dice: DiceApiLike;
  /** All units, for the end-of-round victory read. */
  units: readonly RoundControlUnit[];
  notify?: (message: string, level?: "info" | "warn") => void;
}

export interface ActivationResult {
  attack?: AttackOutcome;
  roundComplete: boolean;
  victory?: VictoryOutcome;
}

/**
 * Activates `attacker` -- resolving its attack on `target` if one is declared --
 * then marks it activated and advances the turn. When that was the last
 * activation, reads the deathmatch victory. Throws if it is not this unit's turn
 * (the round session is the single authority on that, same as the rest of the
 * engine).
 */
export async function resolveActivation(params: ResolveActivationParams): Promise<ActivationResult> {
  const { round, attacker, target, type, dice, units } = params;
  const notify = params.notify ?? (() => undefined);

  if (round.activePlayerId() !== attacker.playerId) {
    throw new IllegalActivationError(
      `it is not ${attacker.playerId}'s turn to activate (expected ${round.activePlayerId() ?? "no one"})`
    );
  }

  let attack: AttackOutcome | undefined;

  if (target && type) {
    attack = await performAttack({ attacker, defender: target, type, dice });

    if ("refused" in attack) {
      notify(`${attacker.id}: ${attack.refused}`, "warn");
    } else {
      notify(
        `${attacker.id} ${type} vs ${target.id}: ${attack.hits} hit(s), ` +
          `${attack.modelsRemoved} model(s) removed${attack.destroyed ? " -- destroyed" : ""}`
      );
    }
  }

  // Activate through the session, which enforces turn/repeat/destroyed rules.
  round.activate(attacker.id);

  if (!round.isComplete()) {
    return { attack, roundComplete: false };
  }

  const victory = checkVictory(
    units.map((unit) => ({ playerId: unit.playerId, isDestroyed: isUnitDestroyed(unit.actor) }))
  );

  if (victory.result === "winner") {
    notify(`Round over: ${victory.playerId} wins -- no enemy models remain.`);
  } else if (victory.result === "draw") {
    notify("Round over: no models remain on either side.", "warn");
  } else {
    notify("Round over: both sides still hold the field. Start a new round.");
  }

  return { attack, roundComplete: true, victory };
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Live model count of a unit, re-exported for the glue's target lists. */
export function survivingModels(unit: RoundControlUnit): number {
  return unitModels(unit.actor);
}

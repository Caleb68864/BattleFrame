import { MODULE_ID, type ActionId, type DieFace } from "../constants";
import { requiresClashTest } from "./actions";
import { syncKnightDefeatedStatus } from "./removal";
import {
  isInBaseContact,
  resolveClashTest,
  type ClashParticipant,
  type ClashResult,
  type DiceApiLike,
  type MeasureApiLike,
} from "../combat/clash";

export interface RoundDie {
  id: string;
  playerId: string;
  knightId: string;
  face: DieFace;
}

export interface ResolvedDie extends RoundDie {
  action: ActionId;
}

export interface BattleframeCombatFlags {
  order: string[];
}

export interface CombatLike {
  flags?: { battleframe?: BattleframeCombatFlags };
}

export interface ActorLike {
  system?: { damage?: number };
  /** Foundry's per-document flag bag, namespaced by package id. Read via round/removal.ts, never directly. */
  flags?: Record<string, Record<string, unknown> | undefined>;
  update: (data: Record<string, unknown>) => Promise<unknown>;
  /** Foundry's native status toggler -- present on real Actors, optional for tests/plain objects. */
  toggleStatusEffect?: (id: string, options?: { active?: boolean }) => Promise<unknown>;
}

/**
 * Applies clash damage to the defending knight's Actor via `actor.update`
 * so the wound persists on the document itself (and therefore survives a
 * world reload) rather than living only in in-memory round state.
 */
export async function applyClashDamage(defenderActor: ActorLike, damage: number): Promise<void> {
  if (damage <= 0) {
    return;
  }

  const current = defenderActor.system?.damage ?? 0;
  const next = Math.min(3, current + damage);
  await defenderActor.update({ "system.damage": next });
  // The wound that reaches the damage limit is exactly when the knight is
  // removed from play -- surface that on the token (roadmap P1).
  await syncKnightDefeatedStatus(defenderActor);
}

export interface ClashParticipantRef extends ClashParticipant {
  actor: ActorLike;
}

export interface ResolveDieActionOptions {
  measure: MeasureApiLike;
  dice: DiceApiLike;
  defender?: ClashParticipantRef;
}

/**
 * Resolves a single spent die's clash test (Bash / Light / Heavy). Base
 * contact is `measure.between(...) === 0` -- GREATHELM has no separate
 * engagement-range concept (vault/greathelm/base-contact-and-engagement.md).
 * Movement faces (Sprint/Encircle/Shift) have no clash to resolve here;
 * their distances are described by round/actions.ts describeAction and
 * applied by the caller's own movement handling.
 */
export async function resolveDieAction(
  die: ResolvedDie,
  attacker: ClashParticipantRef,
  options: ResolveDieActionOptions
): Promise<ClashResult | null> {
  if (!requiresClashTest(die.action)) {
    return null;
  }

  const { defender } = options;

  if (!defender) {
    throw new Error(`${MODULE_ID} | ${die.action} requires a declared defender`);
  }

  if (!isInBaseContact(options.measure, attacker.token, defender.token)) {
    throw new Error(`${MODULE_ID} | ${die.action} requires base contact`);
  }

  const result = await resolveClashTest(die.action, attacker, defender, {
    dice: options.dice,
    measure: options.measure,
  });

  await applyClashDamage(defender.actor, result.damage);

  return result;
}

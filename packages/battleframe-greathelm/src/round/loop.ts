import { MODULE_ID, type ActionId, type DieFace } from "../constants";
import { actionForFace, requiresClashTest } from "./actions";
import {
  isInBaseContact,
  resolveClashTest,
  type ClashParticipant,
  type ClashResult,
  type DiceApiLike,
  type MeasureApiLike,
} from "../combat/clash";
import { runCouragePhase, type CourageKnight, type CourageTestOutcome } from "./courage";

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

function rotateToFirst(playerIds: readonly string[], firstPlayerId: string): string[] {
  const index = playerIds.indexOf(firstPlayerId);

  if (index <= 0) {
    return [...playerIds];
  }

  return [...playerIds.slice(index), ...playerIds.slice(0, index)];
}

/**
 * Walks the battle phase's descending initiative steps, 6 -> 1 (QSR p1) --
 * movement (6/5) always resolves before Bash (4), the last repositioning
 * chance (3), and melee attacks (2/1). Within a step, players alternate
 * one action at a time starting with whoever won initiative
 * (vault/greathelm/battle-phase-initiative-steps.md). A step with no dice
 * of that face is skipped entirely; a player out of dice at the current
 * step is skipped without stalling the other player -- this is how "one
 * side has no legal action" and "a knight with zero dice" both resolve
 * without breaking the loop, since such dice simply never appear in the
 * `dice` array.
 */
export function resolveBattlePhaseOrder(
  dice: readonly RoundDie[],
  firstPlayerId: string,
  playerIds: readonly string[]
): ResolvedDie[] {
  const turnOrder = rotateToFirst(playerIds, firstPlayerId);
  const resolved: ResolvedDie[] = [];

  for (let face = 6; face >= 1; face -= 1) {
    const queues = new Map<string, RoundDie[]>();

    for (const die of dice) {
      if (die.face !== face) {
        continue;
      }

      const queue = queues.get(die.playerId) ?? [];
      queue.push(die);
      queues.set(die.playerId, queue);
    }

    if (queues.size === 0) {
      continue;
    }

    let progressed = true;

    while (progressed) {
      progressed = false;

      for (const playerId of turnOrder) {
        const queue = queues.get(playerId);
        const die = queue?.shift();

        if (die) {
          resolved.push({ ...die, action: actionForFace(die.face) });
          progressed = true;
        }
      }
    }
  }

  return resolved;
}

/**
 * Turn order is written to `combat.flags.battleframe.order` by this
 * module -- core provides no `nextTurn` and no round semantics (see the
 * SS-11 scope note). Ordered by knight, in the sequence each die was
 * spent.
 */
export function writeRoundOrderToCombatFlags(
  combat: CombatLike,
  resolved: readonly ResolvedDie[]
): string[] {
  const order = resolved.map((die) => die.knightId);
  combat.flags = combat.flags ?? {};
  combat.flags.battleframe = { order };

  return order;
}

export interface ActorLike {
  system?: { damage?: number };
  update: (data: Record<string, unknown>) => Promise<unknown>;
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

export interface RunRoundOptions {
  dice: readonly RoundDie[];
  firstPlayerId: string;
  playerIds: readonly string[];
  combat: CombatLike;
  /** Invoked once per spent die, in resolution order, to apply its effect. */
  onActivate?: (die: ResolvedDie) => Promise<void> | void;
  courage: {
    dice: DiceApiLike;
    warbandsKnights: ReadonlyMap<string, readonly CourageKnight[]>;
  };
}

export interface RoundResult {
  order: ResolvedDie[];
  courageOutcomes: Map<string, CourageTestOutcome>;
}

/**
 * Runs one full GREATHELM round's battle + courage phases (the initiative
 * phase -- rolling the pool itself -- is SS-10's dice-pool.ts). The
 * courage phase runs only "after all initiative dice have been spent"
 * (QSR p2), i.e. strictly after the battle-phase loop below completes.
 */
export async function runRound(options: RunRoundOptions): Promise<RoundResult> {
  const order = resolveBattlePhaseOrder(options.dice, options.firstPlayerId, options.playerIds);
  writeRoundOrderToCombatFlags(options.combat, order);

  for (const die of order) {
    if (options.onActivate) {
      await options.onActivate(die);
    }
  }

  const courageOutcomes = await runCouragePhase(options.courage.dice, options.courage.warbandsKnights);

  return { order, courageOutcomes };
}

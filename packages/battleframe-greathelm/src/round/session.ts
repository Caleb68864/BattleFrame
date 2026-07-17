import { MODULE_ID, type DieFace } from "../constants";
import { actionForFace, requiresClashTest } from "./actions";
import {
  isBaseContactDistance,
  type DiceApiLike,
  type MeasureApiLike,
} from "../combat/clash";
import { resolveDieAction, type ActorLike, type ClashParticipantRef, type ResolvedDie } from "./loop";
import { runCouragePhase, type CourageKnight, type CourageTestOutcome } from "./courage";

/**
 * A knight as the session sees it. Deliberately narrower than round-control's
 * `RoundKnight` -- no canvas/Foundry types leak in here, just the two things
 * the verified rules (`resolveDieAction`, base-contact math) actually need:
 * an Actor to write wounds to, and an opaque token to hand to `measure`.
 *
 * `isRemoved` is a live query, not a snapshot: a knight reduced to 0 mid-round
 * must stop being a legal target on the very next call, never on a cached
 * flag the session set once and forgot about. Omit it for a knight that
 * cannot be removed mid-session (default: always in play).
 */
export interface RoundSessionKnight {
  id: string;
  playerId: string;
  name?: string;
  actor: ActorLike;
  token?: unknown;
  isRemoved?: () => boolean;
}

/** One rolled die in a player's initiative pool, before the session assigns it an id. */
export interface PoolDie {
  face: DieFace;
}

export interface CreateRoundSessionOptions {
  knights: readonly RoundSessionKnight[];
  pools: ReadonlyMap<string, readonly PoolDie[]>;
  firstPlayerId: string;
  dice: DiceApiLike;
  measure: MeasureApiLike;
}

/** A die as the session tracks it: no knight assigned until `spendDie` says so. */
export interface RoundSessionDie {
  id: string;
  playerId: string;
  face: DieFace;
}

export type IllegalTargetReason = "knight-removed" | "no-enemy-in-base-contact";

export interface LegalTarget {
  knightId: string;
  legal: boolean;
  reason?: IllegalTargetReason;
}

/** Lets a player declare which of several touching enemies a clash die hits. */
export interface SpendChoices {
  defenderKnightId?: string;
}

/**
 * Thrown by `spendDie`/`discardDie` on any illegal use: wrong player's turn,
 * a face offered out of 6->1 order, or a knight the die may not activate. The
 * panel must never construct one of these in the first place -- if it does,
 * this is a bug in the panel, and it must be loud rather than a silent no-op.
 */
export class IllegalDieSpendError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalDieSpendError";
  }
}

export interface RoundSession {
  /** Every die not yet spent or discarded, across both players. */
  remainingDice(): RoundSessionDie[];
  /** Per-knight legality for the active player's knights, with a reason when illegal. */
  legalTargetsFor(dieId: string): LegalTarget[];
  /** Activates `knightId` with `dieId`. Throws on any illegal (die, knight) pair. */
  spendDie(dieId: string, knightId: string, choices?: SpendChoices): Promise<void>;
  /** Spends `dieId` with no knight activation -- the only way out of a deadlock. */
  discardDie(dieId: string, reason: string): Promise<void>;
  /** True once every die is spent/discarded AND the courage phase has run. */
  isComplete(): boolean;
  /** Whose turn it is to spend/discard next, or undefined once complete. */
  activePlayerId(): string | undefined;
  /** The courage phase's outcomes, once `isComplete()` -- undefined until then. */
  courageOutcomes(): Map<string, CourageTestOutcome> | undefined;
}

function rotateToFirst(playerIds: readonly string[], firstPlayerId: string): string[] {
  const index = playerIds.indexOf(firstPlayerId);

  if (index <= 0) {
    return [...playerIds];
  }

  return [...playerIds.slice(index), ...playerIds.slice(0, index)];
}

function isRemoved(knight: RoundSessionKnight): boolean {
  return knight.isRemoved?.() === true;
}

function toParticipant(knight: RoundSessionKnight): ClashParticipantRef {
  return { id: knight.id, name: knight.name, token: knight.token, actor: knight.actor };
}

/**
 * Nearest living enemy by base-to-base distance. Re-walks every knight, every
 * call -- no cached adjacency, so a knight removed between calls simply stops
 * appearing as a candidate.
 */
function nearestLivingEnemy(
  knight: RoundSessionKnight,
  knights: readonly RoundSessionKnight[],
  measure: MeasureApiLike
): { knight: RoundSessionKnight; distance: number } | undefined {
  let best: { knight: RoundSessionKnight; distance: number } | undefined;

  for (const other of knights) {
    if (other.playerId === knight.playerId || other.id === knight.id || isRemoved(other)) {
      continue;
    }

    const distance = measure.between(knight.token, other.token).distance;

    if (!best || distance < best.distance) {
      best = { knight: other, distance };
    }
  }

  return best;
}

function findDefenderInContact(
  knight: RoundSessionKnight,
  knights: readonly RoundSessionKnight[],
  measure: MeasureApiLike
): RoundSessionKnight | undefined {
  const enemy = nearestLivingEnemy(knight, knights, measure);

  return enemy && isBaseContactDistance(enemy.distance, knight.token) ? enemy.knight : undefined;
}

/**
 * Turns one GREATHELM round into a session the UI pulls from one die at a
 * time, instead of one atomic call that blocks on a `chooseKnight` callback
 * (rejected -- see the sub-spec). All the actual rules are unchanged:
 * `resolveDieAction` still resolves clash tests and writes wounds, and
 * `runCouragePhase` still runs the courage phase; this module only decides
 * *when* a die may be offered and *whether* a spend is legal.
 */
export function createRoundSession(options: CreateRoundSessionOptions): RoundSession {
  const { knights, pools, firstPlayerId, dice, measure } = options;

  const playerIds = rotateToFirst([...pools.keys()], firstPlayerId);
  const unspent = new Map<string, RoundSessionDie[]>(
    [...pools.entries()].map(([playerId, faces]) => [
      playerId,
      faces.map((rolled, index) => ({
        id: `${playerId}-d${index + 1}`,
        playerId,
        face: rolled.face,
      })),
    ])
  );

  let turnPointer = 0;
  let complete = false;
  let outcomes: Map<string, CourageTestOutcome> | undefined;

  function findDie(dieId: string): RoundSessionDie | undefined {
    for (const pool of unspent.values()) {
      const die = pool.find((candidate) => candidate.id === dieId);

      if (die) {
        return die;
      }
    }

    return undefined;
  }

  function currentFace(): DieFace | undefined {
    let max: DieFace | undefined;

    for (const pool of unspent.values()) {
      for (const die of pool) {
        if (max === undefined || die.face > max) {
          max = die.face;
        }
      }
    }

    return max;
  }

  function activePlayerId(): string | undefined {
    if (complete) {
      return undefined;
    }

    const face = currentFace();

    if (face === undefined) {
      return undefined;
    }

    for (let step = 0; step < playerIds.length; step += 1) {
      const index = (turnPointer + step) % playerIds.length;
      const playerId = playerIds[index];

      if ((unspent.get(playerId) ?? []).some((die) => die.face === face)) {
        return playerId;
      }
    }

    return undefined;
  }

  function remainingDice(): RoundSessionDie[] {
    return playerIds.flatMap((playerId) => [...(unspent.get(playerId) ?? [])]);
  }

  function legalTargetsFor(dieId: string): LegalTarget[] {
    const die = findDie(dieId);

    if (!die) {
      throw new IllegalDieSpendError(`unknown die: ${dieId}`);
    }

    const action = actionForFace(die.face);
    const sideKnights = knights.filter((knight) => knight.playerId === die.playerId);

    return sideKnights.map((knight): LegalTarget => {
      if (isRemoved(knight)) {
        return { knightId: knight.id, legal: false, reason: "knight-removed" };
      }

      if (requiresClashTest(action) && !findDefenderInContact(knight, knights, measure)) {
        return { knightId: knight.id, legal: false, reason: "no-enemy-in-base-contact" };
      }

      return { knightId: knight.id, legal: true };
    });
  }

  function requirePlayableDie(dieId: string): { die: RoundSessionDie; playerIndex: number } {
    if (complete) {
      throw new IllegalDieSpendError("round is already complete");
    }

    const die = findDie(dieId);

    if (!die) {
      throw new IllegalDieSpendError(`unknown die: ${dieId}`);
    }

    const face = currentFace();

    if (face === undefined || die.face !== face) {
      throw new IllegalDieSpendError(
        `die ${dieId} (face ${die.face}) may not be played while an unspent die of a ` +
          `higher face remains (current face: ${face ?? "none"})`
      );
    }

    const expectedPlayerId = activePlayerId();

    if (die.playerId !== expectedPlayerId) {
      throw new IllegalDieSpendError(
        `it is not ${die.playerId}'s turn to spend a die (expected ${expectedPlayerId ?? "no one"})`
      );
    }

    return { die, playerIndex: playerIds.indexOf(die.playerId) };
  }

  function consumeDie(playerIndex: number, die: RoundSessionDie): void {
    const pool = unspent.get(die.playerId) ?? [];
    unspent.set(
      die.playerId,
      pool.filter((candidate) => candidate.id !== die.id)
    );
    turnPointer = (playerIndex + 1) % playerIds.length;
  }

  async function maybeCompleteRound(): Promise<void> {
    if (complete) {
      return;
    }

    const anyRemaining = [...unspent.values()].some((pool) => pool.length > 0);

    if (anyRemaining) {
      return;
    }

    const warbandsKnights = new Map<string, CourageKnight[]>(
      playerIds.map((playerId) => [
        playerId,
        knights
          .filter((knight) => knight.playerId === playerId && !isRemoved(knight))
          .map((knight): CourageKnight => ({
            id: knight.id,
            ownerId: knight.playerId,
            damage: knight.actor.system?.damage ?? 0,
            inBaseContactWithEnemy: findDefenderInContact(knight, knights, measure) !== undefined,
          })),
      ])
    );

    outcomes = await runCouragePhase(dice, warbandsKnights);
    complete = true;
  }

  async function spendDie(dieId: string, knightId: string, choices?: SpendChoices): Promise<void> {
    const { die, playerIndex } = requirePlayableDie(dieId);
    const knight = knights.find((candidate) => candidate.id === knightId);

    if (!knight || knight.playerId !== die.playerId) {
      throw new IllegalDieSpendError(`die ${dieId} cannot activate knight ${knightId}`);
    }

    if (isRemoved(knight)) {
      throw new IllegalDieSpendError(`knight ${knightId} has been removed from play`);
    }

    const action = actionForFace(die.face);

    if (requiresClashTest(action)) {
      const declaredDefender = choices?.defenderKnightId
        ? knights.find((candidate) => candidate.id === choices.defenderKnightId)
        : undefined;
      const defender = declaredDefender ?? findDefenderInContact(knight, knights, measure);

      if (!defender || defender.playerId === knight.playerId || isRemoved(defender)) {
        throw new IllegalDieSpendError(
          `die ${dieId} has no legal enemy in base contact for knight ${knightId}`
        );
      }

      if (!isBaseContactDistance(measure.between(knight.token, defender.token).distance, knight.token)) {
        throw new IllegalDieSpendError(`die ${dieId} requires base contact for knight ${knightId}`);
      }

      const resolved: ResolvedDie = {
        id: die.id,
        playerId: die.playerId,
        knightId: knight.id,
        face: die.face,
        action,
      };

      await resolveDieAction(resolved, toParticipant(knight), {
        measure,
        dice,
        defender: toParticipant(defender),
      });
    }

    consumeDie(playerIndex, die);
    await maybeCompleteRound();
  }

  async function discardDie(dieId: string, _reason: string): Promise<void> {
    const { die, playerIndex } = requirePlayableDie(dieId);
    consumeDie(playerIndex, die);
    await maybeCompleteRound();
  }

  return {
    remainingDice,
    legalTargetsFor,
    spendDie,
    discardDie,
    isComplete: () => complete,
    activePlayerId,
    courageOutcomes: () => outcomes,
  };
}

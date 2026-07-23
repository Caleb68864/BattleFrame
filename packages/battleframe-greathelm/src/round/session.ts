import { MODULE_ID, type ActionId, type DieFace } from "../constants";
import { actionForFace, requiresClashTest } from "./actions";
import {
  isBaseContactDistance,
  type DiceApiLike,
  type MeasureApiLike,
} from "../combat/clash";
import { resolveDieAction, type ActorLike, type ClashParticipantRef, type ResolvedDie } from "./loop";
import { runCouragePhase, type CourageKnight, type CourageTestOutcome } from "./courage";
import { isKnightRemoved, markFled } from "./removal";

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
  /** World settings, forwarded to the attack-target prompt so its toggle is honoured. */
  settings?: AttackTargetSettingsLike;
  /**
   * Which touching enemy a clash die hits when 2+ are in base contact. Injected
   * by ui/round-control.ts as `promptAttackTarget`; defaults to the nearest
   * candidate (no prompt) so a session with nothing injected -- every unit test,
   * and any headless caller -- keeps the old silent "nearest" behaviour.
   */
  chooseAttackTarget?: ChooseAttackTarget;
  /**
   * Notified when a clash die resolves, carrying the roll-off + damage + removal
   * so the glue layer (ui/round-control.ts) can post a persistent chat card.
   * Default no-op keeps the pure session UI-free -- a headless caller and every
   * unit test behave exactly as before this seam existed, exactly like the
   * `notify`/`emit` movement seam it parallels.
   */
  onClashResolved?: (outcome: ClashResolvedOutcome) => void | Promise<void>;
}

/** A die as the session tracks it: no knight assigned until `spendDie` says so. */
export interface RoundSessionDie {
  id: string;
  playerId: string;
  face: DieFace;
}

/**
 * A round's serializable in-progress state -- the unspent dice pools, whose turn
 * it is, and whether it has completed. Persisted on the `Combat` document (a
 * flag) so a round survives a reload and syncs, instead of dying with the
 * PoolPanel that held it. The courage `outcomes` are omitted: they exist only
 * once complete, and a complete round is not resumed.
 */
export interface SerializedRoundSession {
  firstPlayerId: string;
  turnPointer: number;
  complete: boolean;
  unspent: Record<string, RoundSessionDie[]>;
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
 * The result of one resolved clash die (Bash / Light / Heavy), as the glue layer
 * needs it to post a persistent outcome card: who struck whom, the clash roll-off,
 * the damage dealt, and the defender's resulting wound total + whether the wound
 * removed it from play. Produced here because the clash resolves inside `spendDie`
 * (via `resolveDieAction`), which is the only place all of it is known at once; the
 * pure session hands it to the injected `onClashResolved` seam and stays UI-free.
 */
export interface ClashResolvedOutcome {
  action: ActionId;
  attackerId: string;
  attackerName?: string;
  defenderId: string;
  defenderName?: string;
  attackerRoll: number;
  defenderRoll: number;
  attackerWins: boolean;
  damage: number;
  /** The defender's total damage AFTER this clash was applied (0..DAMAGE_LIMIT). */
  defenderDamageTotal: number;
  /** Whether that damage (or a prior removal) has taken the defender out of play. */
  defenderRemoved: boolean;
}

/** A defender the attack-target prompt can offer. Structural, so ui/choice-prompts.ts AttackTargetCandidate assigns to it without this pure module importing the UI. */
export interface AttackTargetCandidateLike {
  id: string;
  name?: string;
}

/** The world-settings read the prompt needs, structurally matching ui/choice-prompts.ts WorldSettingsLike. */
export interface AttackTargetSettingsLike {
  get: (namespace: string, key: string) => unknown;
}

/**
 * Chooses which of several touching enemies a clash die hits. Injected by the
 * glue layer (ui/round-control.ts) as ui/choice-prompts.ts `promptAttackTarget`,
 * bound to the world settings; the pure session stays UI-free and defaults to
 * the nearest candidate (candidates[0]) when nothing is injected, so a headless
 * session behaves exactly as it did before this seam existed.
 */
export type ChooseAttackTarget = (options: {
  candidates: readonly AttackTargetCandidateLike[];
  settings?: AttackTargetSettingsLike;
}) => Promise<AttackTargetCandidateLike | undefined>;

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
  /**
   * Whether `dieId` may be played right now -- the single authority for the
   * 6->1 + turn rule. The pool panel reads this rather than re-deriving the
   * rule, so the panel and the spend path cannot disagree about which die is
   * playable. `requirePlayableDie` enforces the same conditions, loudly.
   */
  isOfferable(dieId: string): boolean;
  /** The courage phase's outcomes, once `isComplete()` -- undefined until then. */
  courageOutcomes(): Map<string, CourageTestOutcome> | undefined;
  /** The in-progress state to persist on the Combat document; restore with `restoreRoundSession`. */
  serialize(): SerializedRoundSession;
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
 * Every living enemy in base contact, nearest first. `candidates[0]` is exactly
 * `findDefenderInContact`'s answer -- the nearest enemy is in contact iff any is
 * (a farther one cannot touch when the nearest does not), so the two agree on the
 * default target and only differ in that this also surfaces the *other* touching
 * enemies for the attacker to choose between (QSR: the attacker picks which
 * touching enemy to hit).
 */
function enemiesInBaseContact(
  knight: RoundSessionKnight,
  knights: readonly RoundSessionKnight[],
  measure: MeasureApiLike
): RoundSessionKnight[] {
  return knights
    .filter(
      (other) =>
        other.playerId !== knight.playerId && other.id !== knight.id && !isRemoved(other)
    )
    .map((other) => ({ other, distance: measure.between(knight.token, other.token).distance }))
    .filter((entry) => isBaseContactDistance(entry.distance, knight.token))
    .sort((a, b) => a.distance - b.distance)
    .map((entry) => entry.other);
}

/**
 * Turns one GREATHELM round into a session the UI pulls from one die at a
 * time, instead of one atomic call that blocks on a `chooseKnight` callback
 * (rejected -- see the sub-spec). All the actual rules are unchanged:
 * `resolveDieAction` still resolves clash tests and writes wounds, and
 * `runCouragePhase` still runs the courage phase; this module only decides
 * *when* a die may be offered and *whether* a spend is legal.
 */
export function createRoundSession(
  options: CreateRoundSessionOptions,
  restore?: SerializedRoundSession
): RoundSession {
  const { knights, pools, firstPlayerId, dice, measure, settings } = options;
  // Default to the nearest touching enemy (candidates[0]) so a session with no
  // prompt injected is byte-for-byte the old behaviour; the live path injects
  // ui/choice-prompts.ts promptAttackTarget here.
  const chooseAttackTarget: ChooseAttackTarget =
    options.chooseAttackTarget ?? (async ({ candidates }) => candidates[0]);
  // Default no-op so a headless session posts no card; the live path injects the
  // chat-card poster from ui/round-control.ts.
  const onClashResolved = options.onClashResolved ?? ((): void => undefined);

  /**
   * The defender for a clash die: the nearest touching enemy when only one is in
   * contact, otherwise the attacker's chosen one via `chooseAttackTarget`.
   */
  async function chooseDefenderInContact(
    attacker: RoundSessionKnight
  ): Promise<RoundSessionKnight | undefined> {
    const candidates = enemiesInBaseContact(attacker, knights, measure);

    if (candidates.length <= 1) {
      return candidates[0];
    }

    const chosen = await chooseAttackTarget({
      candidates: candidates.map((candidate) => ({ id: candidate.id, name: candidate.name })),
      settings,
    });

    return candidates.find((candidate) => candidate.id === chosen?.id) ?? candidates[0];
  }

  // A restored round seeds its unspent pools + turn from the persisted state; a
  // fresh round rolls them from the initiative pools. Everything else is the
  // same live machine.
  const effectiveFirstPlayerId = restore?.firstPlayerId ?? firstPlayerId;
  // The restore state is untyped JSON off the Combat document -- it must survive
  // a reload AND a module version change, so a flag written by an older/partial
  // build can arrive without `unspent`, or with a player entry that is not an
  // array. Coerce both here rather than dereference them: a malformed flag must
  // degrade to an empty round, never throw. `advanceRoundCore` re-enters the
  // resume path on every "Run Round" click, and a throw there would brick the
  // round tool permanently (a non-complete flag is never allowed to fall through
  // to a fresh round). See ui/round-control.ts and session.test.ts.
  const restoredUnspent: Record<string, RoundSessionDie[]> =
    restore && restore.unspent && typeof restore.unspent === "object" ? restore.unspent : {};
  const playerKeys = restore ? Object.keys(restoredUnspent) : [...pools.keys()];
  const playerIds = rotateToFirst(playerKeys, effectiveFirstPlayerId);
  const unspent = new Map<string, RoundSessionDie[]>(
    restore
      ? Object.entries(restoredUnspent).map(([playerId, dice_]) => [
          playerId,
          (Array.isArray(dice_) ? dice_ : []).map((die) => ({ ...die })),
        ])
      : [...pools.entries()].map(([playerId, faces]) => [
          playerId,
          faces.map((rolled, index) => ({
            id: `${playerId}-d${index + 1}`,
            playerId,
            face: rolled.face,
          })),
        ])
  );

  let turnPointer = restore?.turnPointer ?? 0;
  let complete = restore?.complete ?? false;
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

  /**
   * The boolean sibling of `requirePlayableDie`: same 6->1 + turn rule, no
   * throw. Both compose `currentFace()` and `activePlayerId()`, so the rule
   * itself has one definition; this exists so the pool panel can ask instead of
   * re-implementing "highest unspent face && active player" in a second file,
   * where the two copies could drift.
   */
  function isOfferable(dieId: string): boolean {
    if (complete) {
      return false;
    }

    const die = findDie(dieId);

    return die !== undefined && die.face === currentFace() && die.playerId === activePlayerId();
  }

  function consumeDie(playerIndex: number, die: RoundSessionDie): void {
    const pool = unspent.get(die.playerId) ?? [];
    unspent.set(
      die.playerId,
      pool.filter((candidate) => candidate.id !== die.id)
    );
    // Alternation is continuous across the whole phase: the pointer advances to
    // the other side and is deliberately NOT reset to the initiative winner at
    // each new initiative step. QSR p1 -- "starting with whoever goes first,
    // players alternate ... working through the current step before the next" --
    // reads as one unbroken alternation, not a per-step restart; "starting with"
    // sets the phase's first activation, once. A now-deleted earlier
    // implementation restarted each step with the winner; the step-boundary test
    // in session.test.ts pins this reading against a silent revert. The residual
    // ambiguity is logged for rulebook verification (courage-order style).
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

    // QSR p2 (confirmed): courage difficulty adds +1 per allied knight removed
    // from play. Those already off the board when the phase begins -- killed by
    // damage this round, or fled in an earlier one -- count too, not only the
    // knights that flee mid-phase (runCouragePhase's own cascade handles those).
    // Seed the count of currently-removed allies per side; without it the
    // difficulty starts at 0 and the death-spiral the rule is built around never
    // gathers, because the losses that should compound it are invisible.
    const initialAlliedRemoved = new Map<string, number>(
      playerIds.map((playerId) => [
        playerId,
        knights.filter((knight) => knight.playerId === playerId && isRemoved(knight)).length,
      ])
    );

    outcomes = await runCouragePhase(dice, warbandsKnights, initialAlliedRemoved);
    await persistCourageFlight(outcomes);
    complete = true;
  }

  /**
   * Writes the courage phase's failures to the Actors that suffered them.
   *
   * `runCouragePhase` is pure -- it returns outcomes and touches no document,
   * which is what makes it testable. Something has to land them, though, and
   * nothing did: the outcomes were computed, exposed via `courageOutcomes()`,
   * and dropped. A knight that failed its test was "removed from play" in the
   * rules and in the returned map, and nowhere else -- so it kept blocking its
   * player's defeat and came back next round as if it had never run.
   */
  async function persistCourageFlight(
    results: ReadonlyMap<string, CourageTestOutcome>
  ): Promise<void> {
    for (const [knightId, outcome] of results) {
      if (outcome.passed) {
        continue;
      }

      const knight = knights.find((candidate) => candidate.id === knightId);

      if (knight) {
        await markFled(knight.actor);
      }
    }
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
      // An explicit UI declaration wins outright; otherwise the attacker is asked
      // which touching enemy to hit when 2+ qualify (nearest by default).
      const defender = declaredDefender ?? (await chooseDefenderInContact(knight));

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

      const clash = await resolveDieAction(resolved, toParticipant(knight), {
        measure,
        dice,
        defender: toParticipant(defender),
      });

      // Surface the resolved clash to the glue so it can post a persistent card.
      // Read AFTER resolveDieAction, which has already applied the damage, so the
      // wound total + removal reflect this clash's effect.
      if (clash) {
        await onClashResolved({
          action,
          attackerId: knight.id,
          attackerName: knight.name,
          defenderId: defender.id,
          defenderName: defender.name,
          attackerRoll: clash.attackerRoll,
          defenderRoll: clash.defenderRoll,
          attackerWins: clash.attackerWins,
          damage: clash.damage,
          defenderDamageTotal: defender.actor.system?.damage ?? 0,
          defenderRemoved: isKnightRemoved(defender.actor),
        });
      }
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
    isOfferable,
    courageOutcomes: () => outcomes,
    serialize: () => ({
      firstPlayerId: effectiveFirstPlayerId,
      turnPointer,
      complete,
      unspent: Object.fromEntries(
        [...unspent.entries()].map(([playerId, dice_]) => [
          playerId,
          dice_.map((die) => ({ ...die })),
        ])
      ),
    }),
  };
}

/**
 * Rebuilds a round session from the state persisted on the Combat document. The
 * inverse of `RoundSession#serialize`; the session is stateless between control
 * clicks and is restored here each time. `pools`/`firstPlayerId` are ignored --
 * the state supplies them.
 */
export function restoreRoundSession(
  options: Omit<CreateRoundSessionOptions, "pools" | "firstPlayerId">,
  state: SerializedRoundSession
): RoundSession {
  return createRoundSession(
    { ...options, pools: new Map(), firstPlayerId: state.firstPlayerId },
    state
  );
}

/**
 * True when a persisted round can still be played against the sides currently on
 * the canvas -- i.e. the side whose round this is (`firstPlayerId`) still has at
 * least one knight present.
 *
 * When it is false the flag is stale: that side's every token was deleted between
 * sessions, so reopening the pool panel on the restored round yields a round that
 * can never be played to completion (the round never leaves the resume branch --
 * the flag stays non-complete, so every "Run Round" click re-enters resume and
 * the tool is bricked). The glue calls this first and starts a FRESH round when
 * it returns false. Note the restore itself is already throw-safe (`rotateToFirst`
 * tolerates a missing id and a malformed `unspent` is coerced); this guard is the
 * glue-level belt that stops a live-but-unplayable round from bricking the tool.
 * Behaviour is unchanged when the flag is resumable (this returns true).
 */
export function isPersistedRoundResumable(
  state: SerializedRoundSession,
  knightPlayerIds: readonly string[]
): boolean {
  return knightPlayerIds.includes(state.firstPlayerId);
}

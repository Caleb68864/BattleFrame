import {
  KNIGHT_ACTOR_TYPE,
  MODULE_ID,
  SETTING_MIN_DICE_POOL_FLOOR_ENABLED,
  type ActionId,
  type DieFace,
} from "../constants";
import { actionForFace, describeAction, requiresClashTest } from "../round/actions";
import {
  computeDicePoolSize,
  determineInitiative,
  type InitiativeOutcome,
  type RolledDie,
} from "../round/dice-pool";
import { type ActorLike, type CombatLike, type ResolvedDie } from "../round/loop";
import {
  createRoundSession,
  type PoolDie,
  type RoundSession,
  type RoundSessionKnight,
} from "../round/session";
import { checkVictory } from "../round/victory";
import type { CheckVictoryKnight } from "../round/victory-types";
import { isKnightRemoved, resetKnight } from "../round/removal";
import {
  promptFirstOrSecond,
  promptResetConfirmation,
  type WorldSettingsLike,
} from "./choice-prompts";
import {
  openPoolPanel,
  type PoolPanelInstance,
  type PoolPanelKnight,
} from "./pool-panel";
import { isBaseContactDistance, type DiceApiLike, type MeasureApiLike } from "../combat/clash";

/**
 * The affordance that starts a round. Everything below the Foundry glue at
 * the bottom of this file is pure and injectable, so the round is testable
 * without a canvas.
 *
 * Provenance discipline, since this file makes more decisions than any other
 * in the package: GREATHELM *rules* come from constants.ts and the vault
 * (QSR v0.4). Where the QSR gives a human a choice that this automation
 * cannot ask for, the choice is made by a documented ENGINE DEFAULT exposed
 * as a swappable seam -- never by inventing a rule. Each one is marked below.
 * See vault/greathelm/open-questions.md, "Standing instruction".
 */

/**
 * Bound on the invented tie re-roll (see `determineInitiativeWithRerolls`).
 *
 * Deliberately NOT in constants.ts: that file's contract is "all GREATHELM
 * numbers live here, sourced from GREATHELM-QSR.pdf v0.4". This number has no
 * rulebook source at all -- it is a loop bound on an invented house rule, and
 * filing it beside SPRINT_MOVE_INCHES would dress it up as a rule. Two
 * consecutive full-pool ties is already vanishingly unlikely; four is a
 * broken dice API, not a game state.
 */
export const MAX_INITIATIVE_TIE_REROLLS = 3;

/** GREATHELM is a two-player game (QSR p1); the round loop assumes exactly two sides. */
const REQUIRED_SIDE_COUNT = 2;

export class WrongSideCountError extends Error {
  constructor(sideCount: number) {
    super(
      `${MODULE_ID} | a GREATHELM round needs exactly ${REQUIRED_SIDE_COUNT} ` +
        `sides with knights in play, found ${sideCount}`
    );
    this.name = "WrongSideCountError";
  }
}

/**
 * Thrown when the invented tie re-roll fails to break a tie within
 * `MAX_INITIATIVE_TIE_REROLLS`. Fails loudly rather than picking a side:
 * silently choosing a first player would be indistinguishable, in the chat
 * log, from a real initiative result.
 */
export class InitiativeTieUnresolvedError extends Error {
  constructor(attempts: number) {
    super(
      `${MODULE_ID} | initiative still tied after ${attempts} re-rolls; ` +
        "refusing to pick a first player (the tie re-roll is an invented " +
        "house rule -- see vault/greathelm/open-questions.md #15)"
    );
    this.name = "InitiativeTieUnresolvedError";
  }
}

/**
 * A knight as the round control sees it: its Actor (so wounds persist), its
 * token (so distances are measured base-to-base), and which side it fights
 * for.
 */
export interface RoundKnight {
  id: string;
  playerId: string;
  name?: string;
  actor: ActorLike;
  /** Opaque here -- only ever handed to `measure.between` (as in loop.ts/clash.ts). */
  token?: unknown;
  /**
   * The real canvas Token placeable, for rendering only (tinting reads
   * `.mesh`). Deliberately NOT `token` above: that is a reshaped double
   * carrying only what `measure.between` reads, and it has no `.mesh` -- tint
   * it and nothing happens, silently. Keep the two apart.
   */
  placeable?: unknown;
}

/**
 * A Combat document, as opposed to loop.ts's `CombatLike` (a plain object).
 * `setFlag` is what actually persists to the document.
 */
export interface CombatDocumentLike extends CombatLike {
  setFlag: (scope: string, key: string, value: unknown) => Promise<unknown>;
}

/** What a movement die bought, after measuring and capping. */
export interface MovementPlan {
  knightId: string;
  action: ActionId;
  /** The face's allowance from constants.ts -- Sprint 5", Encircle 3", Shift 1". */
  allowanceInches: number;
  /** Base-to-base distance to the nearest enemy, via game.battleframe.measure. */
  distanceToNearestEnemyInches: number;
  /** The capped move: never more than the allowance. */
  moveInches: number;
}

export function knightsOfSide(
  knights: readonly RoundKnight[],
  playerId: string
): RoundKnight[] {
  return knights.filter((knight) => knight.playerId === playerId);
}

export function sideIds(knights: readonly RoundKnight[]): string[] {
  return [...new Set(knights.map((knight) => knight.playerId))];
}

/**
 * Rolls one player's initiative pool, one die at a time through the shared
 * `game.battleframe.dice.roll` API. One `1d6` per die rather than a single
 * `Nd6`: the pool is read by FACE (see dice-pool.ts countFaces), and a summed
 * total would throw the faces away. Rolling through the shared API -- never
 * Math.random() -- is also what keeps Dice So Nice working.
 */
export async function rollPool(
  dice: DiceApiLike,
  size: number,
  playerId: string
): Promise<RolledDie[]> {
  const rolled: RolledDie[] = [];

  for (let index = 0; index < size; index += 1) {
    const result = await dice.roll(
      "1d6",
      {},
      { rulesetId: MODULE_ID, flavor: `initiative die ${index + 1}/${size} (${playerId})` }
    );
    rolled.push({ face: result.total });
  }

  return rolled;
}

export interface InitiativeRoll {
  outcome: InitiativeOutcome;
  pools: Map<string, RolledDie[]>;
  /** How many re-rolls the tie rule consumed. 0 on a clean first roll. */
  rerolls: number;
}

/**
 * Rolls both pools and determines initiative, re-rolling BOTH pools on an
 * exact tie.
 *
 * >>> INVENTED HOUSE RULE. <<< QSR v0.4 does not specify what happens when
 * two players hold equal counts at every face -- it covers "most 6s chooses",
 * "neither has 6s -> cascade to 5s, 4s...", and "only one player has 6s ->
 * forced first", and stops there. The re-roll below is this project's
 * invention, decreed in the "Decisions (SS-10)" block of
 * docs/specs/2026-07-16-battleframe-core-mvp.md and recorded as
 * vault/greathelm/open-questions.md #15. It is NOT a rule from the rulebook,
 * and it must not be presented to a player as one. Close it by buying the
 * full rulebook.
 *
 * The loop is bounded by MAX_INITIATIVE_TIE_REROLLS so a pathological tie
 * (or a stuck dice API returning constant faces) cannot spin forever; it
 * throws rather than guessing a winner.
 */
export async function determineInitiativeWithRerolls(
  dice: DiceApiLike,
  playerAId: string,
  playerAPoolSize: number,
  playerBId: string,
  playerBPoolSize: number
): Promise<InitiativeRoll> {
  for (let rerolls = 0; rerolls <= MAX_INITIATIVE_TIE_REROLLS; rerolls += 1) {
    const playerADice = await rollPool(dice, playerAPoolSize, playerAId);
    const playerBDice = await rollPool(dice, playerBPoolSize, playerBId);
    const outcome = determineInitiative(playerAId, playerADice, playerBId, playerBDice);

    if (outcome.result !== "tie") {
      return {
        outcome,
        pools: new Map([
          [playerAId, playerADice],
          [playerBId, playerBDice],
        ]),
        rerolls,
      };
    }
  }

  throw new InitiativeTieUnresolvedError(MAX_INITIATIVE_TIE_REROLLS);
}

/**
 * The initiative winner's first-or-second choice.
 *
 * QSR p1 is explicit that the player with the most 6s *chooses* whether to go
 * first or second -- and equally explicit that a sole holder of 6s is FORCED
 * first, with no choice at all (vault/greathelm/initiative-order-determination.md).
 * `forced-first` is therefore a rule and is honoured unconditionally below.
 * `choose` is a human decision this automation cannot ask for, so it takes an
 * ENGINE DEFAULT of "first" -- exposed as the `chooseOrder` seam so a real
 * picker can be injected later without touching the round loop. Defaulting is
 * not the same as knowing: a GM who wants to go second must currently move
 * the dice by hand.
 */
export function resolveFirstPlayer(
  outcome: InitiativeOutcome,
  playerIds: readonly string[],
  choice: "first" | "second" = "first"
): string {
  if (outcome.result === "tie") {
    throw new InitiativeTieUnresolvedError(MAX_INITIATIVE_TIE_REROLLS);
  }

  if (outcome.result === "forced-first" || choice === "first") {
    return outcome.playerId;
  }

  const other = playerIds.find((playerId) => playerId !== outcome.playerId);

  return other ?? outcome.playerId;
}

export interface NearestEnemy {
  knight: RoundKnight;
  distance: number;
}

/**
 * Nearest enemy by base-to-base distance, via `game.battleframe.measure`.
 * Base-to-base is the only mode the measurement service has, and the only
 * one GREATHELM's rules are written in.
 */
export function nearestEnemy(
  knight: RoundKnight,
  knights: readonly RoundKnight[],
  measure: MeasureApiLike
): NearestEnemy | undefined {
  let best: NearestEnemy | undefined;

  for (const other of knights) {
    if (other.playerId === knight.playerId || other.id === knight.id) {
      continue;
    }

    const distance = measure.between(knight.token, other.token).distance;

    if (!best || distance < best.distance) {
      best = { knight: other, distance };
    }
  }

  return best;
}

/**
 * Measures a movement die and caps it at the face's allowance.
 *
 * This is the caller loop.ts:154-181 defers to ("their distances are
 * described by round/actions.ts describeAction and applied by the caller's
 * own movement handling") -- and describeAction's first real caller, so
 * SPRINT_MOVE_INCHES now reaches a live code path instead of dying in a
 * function nothing called.
 *
 * `moveInches = min(allowance, distance-to-nearest-enemy)`: every GREATHELM
 * distance is "up to" (vault/greathelm/movement-and-measurement.md), so a
 * Sprint is capped at SPRINT_MOVE_INCHES = 5" and additionally stops at base
 * contact rather than measuring through the enemy it is closing on.
 *
 * The plan is reported, NOT applied to the token. That is deliberate. The
 * same vault note records, as `confirmed`, that knights "cannot move through
 * spaces smaller than their base width, or through terrain", and the
 * Kickstarter adds that models cannot move through other models -- so an
 * engine needs real collision, "not just range checks". Auto-sliding a token
 * along a straight line toward its target would break a confirmed rule
 * silently, on a board where 5" crosses most of the play area. Until
 * collision exists, the engine states the legal distance and the GM moves the
 * model, with the ruler agreeing with the rules engine.
 */
export function planMovement(
  die: ResolvedDie,
  mover: RoundKnight,
  knights: readonly RoundKnight[],
  measure: MeasureApiLike
): MovementPlan | null {
  if (requiresClashTest(die.action)) {
    return null;
  }

  const allowanceInches = describeAction(die.action).moveInches;

  if (allowanceInches === undefined) {
    return null;
  }

  const enemy = nearestEnemy(mover, knights, measure);

  if (!enemy) {
    return null;
  }

  return {
    knightId: mover.id,
    action: die.action,
    allowanceInches,
    distanceToNearestEnemyInches: enemy.distance,
    moveInches: Math.min(allowanceInches, enemy.distance),
  };
}

/**
 * The defender for a clash die: an enemy already in base contact -- GREATHELM
 * has no separate engagement range, see
 * vault/greathelm/base-contact-and-engagement.md.
 *
 * Contact is decided by combat/clash.ts `isBaseContactDistance`, never by a
 * local `=== 0` here: an exact-zero test cannot fire on integer pixel
 * coordinates and made every clash die a no-op (see
 * BASE_CONTACT_TOLERANCE_PX). The measured distance is reused rather than
 * re-measured -- `nearestEnemy` has already paid for it.
 *
 * ENGINE DEFAULT on the choice, not on the rule: Bash/Light/Heavy legally
 * REQUIRE base contact, so an enemy out of contact is never a legal target
 * and a die with no contact simply cannot be spent this way. Which of several
 * touching enemies to hit is the attacker's choice; the nearest (the first one
 * inside the contact tolerance) stands in for a target picker.
 */
export function findDefenderInBaseContact(
  attacker: RoundKnight,
  knights: readonly RoundKnight[],
  measure: MeasureApiLike
): RoundKnight | undefined {
  const enemy = nearestEnemy(attacker, knights, measure);

  return enemy && isBaseContactDistance(enemy.distance, attacker.token)
    ? enemy.knight
    : undefined;
}

/**
 * The session (round/session.ts) needs a live `isRemoved` predicate per
 * knight; this is where a canvas-gathered RoundKnight is translated into one.
 * The rule itself lives in round/removal.ts -- both routes out of play, in one
 * place -- and is re-read on every call so a knight downed or routed mid-round
 * drops out immediately rather than on a cached flag.
 */
function toSessionKnight(knight: RoundKnight): RoundSessionKnight {
  return {
    id: knight.id,
    playerId: knight.playerId,
    name: knight.name,
    actor: knight.actor,
    token: knight.token,
    isRemoved: () => isKnightRemoved(knight.actor),
  };
}

/**
 * A canvas knight as the game-end check needs it.
 *
 * This exists because `RoundKnight` has no `isRemoved` and
 * `CheckVictoryKnight.isRemoved` is optional, so handing the raw list to
 * `checkVictory` typechecked cleanly and read every knight as in play --
 * making victory unreachable from *any* cause, damage included. An optional
 * member is not a seam to route a rule through; the translation is explicit
 * and tested instead.
 */
export function toVictoryKnights(
  knights: readonly RoundKnight[]
): CheckVictoryKnight[] {
  return knights.map((knight) => ({
    playerId: knight.playerId,
    isRemoved: () => isKnightRemoved(knight.actor),
  }));
}

/**
 * Decimal places for distances shown to a player.
 *
 * PRESENTATION ONLY -- the maths is never rounded. The measured board is full
 * of irrational-in-pixels quantities (see clash.ts BASE_CONTACT_TOLERANCE_PX),
 * so a raw float reached the notification bar as `sprint up to
 * 0.0001574803149606563"`, which is not a number a human reads. Two places is
 * finer than any GREATHELM distance is written in (5"/3"/1") and finer than a
 * GM can place a model by hand.
 */
const DISPLAY_DECIMAL_PLACES = 2;

/** A measured distance as a player should see it. Never feed this back into the rules. */
export function formatInches(inches: number): string {
  const factor = 10 ** DISPLAY_DECIMAL_PLACES;

  // Number() drops trailing zeros, so 5 stays `5"` rather than becoming `5.00"`.
  return `${Number((Math.round(inches * factor) / factor).toFixed(DISPLAY_DECIMAL_PLACES))}`;
}

export interface BeginRoundFromControlOptions {
  knights: readonly RoundKnight[];
  combat: CombatDocumentLike;
  dice: DiceApiLike;
  measure: MeasureApiLike;
  /** Kickstarter-only floor; off unless the world setting says otherwise. */
  minDicePoolFloorEnabled?: boolean;
  /** Seam for the initiative winner's first-or-second choice. See resolveFirstPlayer. */
  chooseOrder?: (outcome: InitiativeOutcome) => "first" | "second" | Promise<"first" | "second">;
  notify?: (message: string) => void;
}

export interface BeginRoundFromControlResult {
  /**
   * The suspendable round -- one die at a time, driven by the pool panel.
   * Wraps round/session.ts's pure `createRoundSession`: same legality rules,
   * with the Foundry side effects a headless session must not know about
   * (movement notifications, and persisting the spend order to the Combat
   * document once the round completes) layered on top here instead.
   */
  session: RoundSession;
  firstPlayerId: string;
  tieRerolls: number;
  poolSizes: Map<string, number>;
}

/**
 * Sets up one GREATHELM round and hands back a session the pool panel pulls
 * from: gather -> roll pools (knights + 1) -> determine initiative on most 6s
 * (re-rolling an exact tie) -> the initiative winner's first-or-second choice
 * -> a live session for the battle and courage phases.
 *
 * This is deliberately NOT `runRoundFromControl` any more. That function
 * resolved every die itself via a round-robin die-to-knight assigner and a
 * single atomic `runRound` -- the auto-battler the player layer kills. Both
 * are now gone (the assigner deleted with the player layer, `runRound` and
 * its battle-phase helpers deleted from loop.ts as dead code). The battle
 * phase now belongs to whoever plays the returned session's dice one at a
 * time (see `onRoundControlActivated` below, which hands it to the pool
 * panel); round-control.ts no longer decides which knight spends which die.
 *
 * Note what is NOT here: the QSR's optional "re-roll any dice that are not
 * 6's, once" (vault/greathelm/initiative-phase.md) is a per-die player
 * decision with no automatable default -- skipping it costs a player an
 * option, whereas guessing at it would spend their dice for them. Left out
 * deliberately; it needs the same picker UI as the seams above.
 */
export async function beginRoundFromControl(
  options: BeginRoundFromControlOptions
): Promise<BeginRoundFromControlResult> {
  const { knights, combat, dice, measure } = options;
  const sides = sideIds(knights);

  if (sides.length !== REQUIRED_SIDE_COUNT) {
    throw new WrongSideCountError(sides.length);
  }

  const [playerAId, playerBId] = sides;
  const poolSizes = new Map<string, number>(
    sides.map((playerId) => [
      playerId,
      computeDicePoolSize(
        // QSR p1 (confirmed): "1 initiative die for every knight you control in
        // the play area, plus 1" -- and the pool "shrinks as your knights die".
        // Removed knights keep their tokens on the canvas, so they must be
        // filtered out of the count here, or a wiped-down warband keeps rolling
        // a full pool and the death-spiral never bites.
        knightsOfSide(knights, playerId).filter((knight) => !isKnightRemoved(knight.actor)).length,
        options.minDicePoolFloorEnabled === true
      ),
    ])
  );

  const initiative = await determineInitiativeWithRerolls(
    dice,
    playerAId,
    poolSizes.get(playerAId) ?? 0,
    playerBId,
    poolSizes.get(playerBId) ?? 0
  );

  const choice = options.chooseOrder ? await options.chooseOrder(initiative.outcome) : "first";
  const firstPlayerId = resolveFirstPlayer(initiative.outcome, sides, choice);

  const pools = new Map<string, readonly PoolDie[]>(
    sides.map((playerId) => [
      playerId,
      (initiative.pools.get(playerId) ?? []).map(
        (rolled): PoolDie => ({ face: rolled.face as DieFace })
      ),
    ])
  );

  const baseSession = createRoundSession({
    knights: knights.map(toSessionKnight),
    pools,
    firstPlayerId,
    dice,
    measure,
  });

  const emit = options.notify ?? ((): void => undefined);
  const byId = new Map(knights.map((knight) => [knight.id, knight]));
  const persistedOrder: string[] = [];
  let persisted = false;

  // Turn order is persisted via the document's own setFlag, once the session
  // reports complete. An earlier loop.ts helper assigned to a plain `flags`
  // object instead, which on a real Combat document never reaches the
  // database; it has since been deleted as dead code, and this setFlag is the
  // only writer of round order now.
  async function maybeFinish(): Promise<void> {
    if (persisted || !baseSession.isComplete()) {
      return;
    }

    persisted = true;
    await combat.setFlag("battleframe", "order", persistedOrder);
    emit(
      `${localize("battleframe-greathelm.controls.round.complete")} ` +
        `(${persistedOrder.length} dice, first: ${firstPlayerId}` +
        `${initiative.rerolls > 0 ? `, tie re-rolls: ${initiative.rerolls}` : ""})`
    );
  }

  const session: RoundSession = {
    remainingDice: () => baseSession.remainingDice(),
    legalTargetsFor: (dieId) => baseSession.legalTargetsFor(dieId),
    isOfferable: (dieId) => baseSession.isOfferable(dieId),
    async spendDie(dieId, knightId, choices) {
      // Movement (Sprint/Encircle/Shift) is reported here, never applied to
      // the token -- see planMovement's own comment: auto-sliding a model
      // could silently violate the "cannot move through models/terrain/
      // narrower gaps" rule the vault confirms and this codebase has no
      // collision for. The session itself never measures movement; that
      // stays Foundry-glue, same as every other notification.
      const die = baseSession.remainingDice().find((candidate) => candidate.id === dieId);
      const mover = byId.get(knightId);
      const action = die ? actionForFace(die.face) : undefined;

      if (die && mover && action && !requiresClashTest(action)) {
        const plan = planMovement(
          { id: die.id, playerId: die.playerId, knightId, face: die.face, action },
          mover,
          knights,
          measure
        );

        if (plan) {
          emit(`${mover.name ?? mover.id}: ${action} up to ${formatInches(plan.moveInches)}"`);
        }
      }

      await baseSession.spendDie(dieId, knightId, choices);
      persistedOrder.push(knightId);
      await maybeFinish();
    },
    async discardDie(dieId, reason) {
      await baseSession.discardDie(dieId, reason);
      await maybeFinish();
    },
    isComplete: () => baseSession.isComplete(),
    activePlayerId: () => baseSession.activePlayerId(),
    courageOutcomes: () => baseSession.courageOutcomes(),
  };

  return { session, firstPlayerId, tieRerolls: initiative.rerolls, poolSizes };
}

/* ------------------------------------------------------------------------ *
 * Foundry glue
 * ------------------------------------------------------------------------ */

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

function currentUser(): { isGM?: boolean } | undefined {
  const globalScope = globalThis as unknown as { game?: { user?: { isGM?: boolean } } };

  return globalScope.game?.user;
}

export function isGM(): boolean {
  return currentUser()?.isGM === true;
}

function resolveGame(): {
  battleframe?: { dice?: DiceApiLike; measure?: MeasureApiLike };
  combat?: CombatDocumentLike | null;
  settings?: { get: (namespace: string, key: string) => unknown };
} | undefined {
  const globalScope = globalThis as unknown as {
    game?: {
      battleframe?: { dice?: DiceApiLike; measure?: MeasureApiLike };
      combat?: CombatDocumentLike | null;
      settings?: { get: (namespace: string, key: string) => unknown };
    };
  };

  return globalScope.game;
}

interface CanvasTokenLike {
  id?: string;
  name?: string;
  center?: { x: number; y: number };
  scene?: unknown;
  document?: {
    id?: string;
    disposition?: number;
    flags?: unknown;
    width?: number;
    height?: number;
  };
  actor?: (ActorLike & { id?: string; name?: string; type?: string }) | null;
}

/**
 * Which side a knight fights for, derived from its token disposition.
 *
 * ENGINE DEFAULT. GREATHELM is a two-player game and the QSR never says how a
 * warband is identified -- warband construction is flatly "not found" in the
 * source (vault/greathelm/warband-construction.md), so there is no rule to
 * follow here and nothing to invent one from. Token disposition is Foundry's
 * own two-sided split and needs no new data model; it is a seam, not a
 * finding. Ownership-based sides would be the alternative if warbands ever
 * gain identity.
 */
export function sideFromDisposition(disposition: number | undefined): string {
  return (disposition ?? 0) < 0 ? "hostile" : "friendly";
}

/**
 * Gathers knights from the canvas. A token counts if its Actor is this
 * module's knight subtype -- namespaced `battleframe-greathelm.knight`, per
 * vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md.
 *
 * The measurement service wants one object carrying the base flags, the
 * width/height, the pixel centre and the scene (see
 * packages/battleframe/src/measurement/types.ts MeasurableToken); on the
 * canvas those live across the placeable and its document, so they are
 * merged here. Verified only against the type in core, not a live v14
 * canvas -- see the HUMAN REVIEW criterion in SS-13.
 */
export function gatherKnightsFromCanvas(): RoundKnight[] {
  const globalScope = globalThis as unknown as {
    canvas?: { tokens?: { placeables?: CanvasTokenLike[] }; scene?: unknown };
  };
  const placeables = globalScope.canvas?.tokens?.placeables ?? [];
  const knightType = `${MODULE_ID}.${KNIGHT_ACTOR_TYPE}`;

  return placeables.flatMap((placeable) => {
    const actor = placeable.actor;

    if (!actor || actor.type !== knightType) {
      return [];
    }

    const id = actor.id ?? placeable.document?.id ?? placeable.id;

    if (!id) {
      return [];
    }

    return [
      {
        id,
        playerId: sideFromDisposition(placeable.document?.disposition),
        name: actor.name ?? placeable.name,
        actor,
        placeable,
        token: {
          flags: placeable.document?.flags,
          width: placeable.document?.width,
          height: placeable.document?.height,
          center: placeable.center,
          scene: placeable.scene ?? globalScope.canvas?.scene,
        },
      },
    ];
  });
}

/** i18n with interpolation; falls back to the bare key like `localize`. */
function format(key: string, data: Record<string, string | number>): string {
  const globalScope = globalThis as unknown as {
    game?: { i18n?: { format?: (key: string, data: Record<string, string | number>) => string } };
  };

  return globalScope.game?.i18n?.format?.(key, data) ?? key;
}

/**
 * A human label for a side.
 *
 * A side is not a knight. This once returned a single knight's `name`, so the
 * win banner announced "Sir Bedwyr wins" for a whole warband -- confidently
 * naming one model as if it were the army. The intent was right (a raw
 * disposition id like "hostile" is engine vocabulary, not player prose); the
 * fix was to name the wrong thing. The side ids are localized instead, so the
 * banner reads "The hostile warband wins".
 *
 * Falls back to the id itself for an unmapped disposition rather than a raw
 * i18n key -- `sideFromDisposition` only ever yields `friendly`/`hostile`,
 * both mapped, but "hostile" is still readable if that ever changes.
 */
export function sideLabel(playerId: string): string {
  const key = `${MODULE_ID}.side.${playerId}`;
  const label = localize(key);

  return label === key ? playerId : label;
}

function localize(key: string): string {
  const globalScope = globalThis as unknown as {
    game?: { i18n?: { localize?: (key: string) => string } };
  };

  return globalScope.game?.i18n?.localize?.(key) ?? key;
}

function notifyUser(message: string, level: "info" | "warn" | "error" = "info"): void {
  const globalScope = globalThis as unknown as {
    ui?: { notifications?: Record<string, ((message: string) => void) | undefined> };
  };
  const notifications = globalScope.ui?.notifications;

  // Called AS `notifications[level](message)`, not destructured into a bare
  // reference first: Foundry's own `error()`/`warn()`/`info()` read `this`
  // internally, and a detached reference throws the moment the reporter
  // tries to report -- which happened live, and masked whatever the round
  // actually failed on. Keeping the call on `notifications` preserves `this`.
  if (typeof notifications?.[level] === "function") {
    notifications[level]?.(message);

    return;
  }

  console.log(`${MODULE_ID} | ${message}`);
}

function minDicePoolFloorEnabled(): boolean {
  return resolveGame()?.settings?.get(MODULE_ID, SETTING_MIN_DICE_POOL_FLOOR_ENABLED) === true;
}

/**
 * The scene control's click handler: sets up one round and opens the pool
 * panel for the GM to play it, die by die.
 *
 * GM-only, and checked here rather than only on the button's visibility. A
 * round rolls dice and, once opened, the panel writes wounds to Actors and
 * turn order to the Combat document -- all shared state a player must not be
 * able to mutate, and a hidden button is not an access control.
 *
 * This function no longer resolves the round itself -- that was the
 * round-robin auto-battler this sub-spec kills. It rolls initiative, asks
 * the winner first-or-second
 * (`promptFirstOrSecond`, honouring `forced-first` as a rule with no prompt),
 * builds the session, and hands it to `openPoolPanel` -- the panel resolves
 * every die from there, one GM click at a time.
 */
/**
 * The QSR p2 game-end check, applied after the courage phase, plus the loop it
 * mandates in the same sentence: "If only one player has knights remaining in
 * the play area, they win! If not, start a new round from the initiative
 * phase."
 *
 * The unresolved case is announced, never guessed at -- see `round/victory.ts`.
 */
async function resolveRoundEnd(
  knights: readonly RoundKnight[],
  roundNumber: number
): Promise<void> {
  const outcome = checkVictory(toVictoryKnights(knights));

  if (outcome.result === "winner") {
    notifyUser(
      format("battleframe-greathelm.victory.winner", {
        player: sideLabel(outcome.playerId),
      })
    );

    return;
  }

  if (outcome.result === "mutual-elimination-unresolved") {
    // Deliberately not a draw: QSR v0.4 says "only one player has knights
    // remaining", and does not address nobody having any. Telling the players
    // the rulebook is silent is honest; inventing a draw and presenting it as
    // GREATHELM is not.
    notifyUser(localize("battleframe-greathelm.victory.mutualElimination"), "warn");

    return;
  }

  notifyUser(
    format("battleframe-greathelm.victory.continue", { round: roundNumber })
  );
  await onRoundControlActivated(roundNumber + 1);
}

export async function onRoundControlActivated(
  roundNumber = 1
): Promise<PoolPanelInstance | undefined> {
  if (!isGM()) {
    notifyUser(localize("battleframe-greathelm.controls.round.gmOnly"), "warn");

    return undefined;
  }

  const game = resolveGame();
  const dice = game?.battleframe?.dice;
  const measure = game?.battleframe?.measure;
  const combat = game?.combat;

  if (!dice || !measure) {
    notifyUser(localize("battleframe-greathelm.controls.round.noApi"), "error");

    return undefined;
  }

  if (!combat) {
    notifyUser(localize("battleframe-greathelm.controls.round.noCombat"), "warn");

    return undefined;
  }

  const knights = gatherKnightsFromCanvas();
  const settings = game?.settings as WorldSettingsLike | undefined;

  try {
    const { session } = await beginRoundFromControl({
      knights,
      combat,
      dice,
      measure,
      minDicePoolFloorEnabled: minDicePoolFloorEnabled(),
      notify: (message) => notifyUser(message),
      chooseOrder: (outcome) => promptFirstOrSecond({ outcome, settings }),
    });

    const panelKnights: PoolPanelKnight[] = knights.map((knight) => ({
      id: knight.id,
      playerId: knight.playerId,
      name: knight.name ?? knight.id,
      token: knight.placeable,
    }));

    return openPoolPanel(session, panelKnights, () =>
      resolveRoundEnd(knights, roundNumber)
    );
  } catch (error) {
    // Contained: a ruleset throwing in its own loop must surface the ruleset
    // id and leave the world usable (see the Edge Cases table).
    const message = error instanceof Error ? error.message : String(error);
    notifyUser(message, "error");
    console.error(`${MODULE_ID} | round failed`, error);

    return undefined;
  }
}

/**
 * The "New Battle" scene control: returns every knight on the canvas to
 * pristine state so a second battle can be played without hand-editing each
 * Actor. Damage, momentum and the fled flag all persist on the document (see
 * `round/removal.ts`), so without this the victory check fires before the first
 * die of battle two is thrown.
 *
 * GM-only for the same reason as the round: it writes to shared Actor state.
 * Destructive, so it confirms first through `promptResetConfirmation`, whose
 * no-dialog default is *not* to reset -- an absent confirmation is never
 * consent. Returns the number of knights reset (0 if cancelled or none found),
 * which is what the tests assert against.
 */
export async function resetBattleFromControl(): Promise<number> {
  if (!isGM()) {
    notifyUser(localize("battleframe-greathelm.controls.round.gmOnly"), "warn");

    return 0;
  }

  const knights = gatherKnightsFromCanvas();

  if (knights.length === 0) {
    notifyUser(localize("battleframe-greathelm.controls.newBattle.noKnights"), "warn");

    return 0;
  }

  if (!(await promptResetConfirmation())) {
    return 0;
  }

  for (const knight of knights) {
    await resetKnight(knight.actor);
  }

  notifyUser(
    format("battleframe-greathelm.controls.newBattle.done", { count: knights.length })
  );

  return knights.length;
}

/**
 * The scene control entry itself.
 *
 * >>> UNVERIFIED against Foundry v14. <<< This is not modesty, it is the
 * literal state of the evidence: vault/foundry-systems/ carries no note on
 * `getSceneControlButtons` at any confidence -- not `confirmed`, not
 * `unverified`, none. Nothing in this repo has ever called it. What is known
 * is that the hook's payload changed shape across recent majors (an ARRAY of
 * controls with an array of `tools` in the older idiom; a keyed RECORD of
 * controls and tools in the newer one), and remembered Foundry idioms are
 * exactly what the spec's "Preferences" section warns are usually stale.
 *
 * So this handler asserts nothing and accommodates both shapes, and sets both
 * `onClick` and `onChange` for the same reason. If v14 takes a third shape,
 * the button will not appear -- it will not corrupt anything, and the
 * SS-13 [HUMAN REVIEW] criterion ("a GM can start and complete a round in a
 * live v14 world") is the check that settles it. Whoever runs that: confirm
 * the real shape, WRITE THE VAULT NOTE, then delete the branch that turns out
 * to be wrong. Do not leave this comment standing as an excuse.
 */
export function addRoundSceneControl(controls: unknown): void {
  const tool = {
    name: "greathelm-run-round",
    title: "battleframe-greathelm.controls.round.tool",
    icon: "fas fa-dice-d6",
    button: true,
    visible: isGM(),
    order: 0,
    onClick: () => {
      void onRoundControlActivated();
    },
    onChange: () => {
      void onRoundControlActivated();
    },
  };

  // "New Battle": the same button shape as the round tool (which is
  // live-verified on v14.363), so it accommodates both payload idioms without
  // asserting either. A separate tool rather than a mode of the round tool --
  // resetting is a distinct, destructive action, not a way to start a round.
  const newBattleTool = {
    name: "greathelm-new-battle",
    title: "battleframe-greathelm.controls.newBattle.tool",
    icon: "fas fa-flag",
    button: true,
    visible: isGM(),
    order: 1,
    onClick: () => {
      void resetBattleFromControl();
    },
    onChange: () => {
      void resetBattleFromControl();
    },
  };

  const control = {
    name: MODULE_ID,
    title: "battleframe-greathelm.controls.round.title",
    icon: "fas fa-chess-rook",
    layer: "tokens",
    visible: isGM(),
    order: 0,
    activeTool: tool.name,
    tools: {} as Record<string, unknown> | unknown[],
  };

  if (Array.isArray(controls)) {
    control.tools = [tool, newBattleTool];
    controls.push(control);

    return;
  }

  if (controls && typeof controls === "object") {
    control.tools = { [tool.name]: tool, [newBattleTool.name]: newBattleTool };
    (controls as Record<string, unknown>)[MODULE_ID] = control;
  }
}

/**
 * Registers the round trigger. This needs NO change to packages/battleframe:
 * `getSceneControlButtons` is Foundry's own hook and any module may answer
 * it, so the ruleset adds its UI without core learning that a round exists.
 */
export function registerRoundControl(): void {
  if (!hooksAvailable()) {
    return;
  }

  Hooks.on("getSceneControlButtons", (...args: unknown[]) => {
    addRoundSceneControl(args[0]);
  });
}

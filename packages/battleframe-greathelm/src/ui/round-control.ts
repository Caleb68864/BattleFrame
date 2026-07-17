import {
  KNIGHT_ACTOR_TYPE,
  MODULE_ID,
  SETTING_MIN_DICE_POOL_FLOOR_ENABLED,
  type ActionId,
  type DieFace,
} from "../constants";
import { describeAction, requiresClashTest } from "../round/actions";
import {
  computeDicePoolSize,
  determineInitiative,
  type InitiativeOutcome,
  type RolledDie,
} from "../round/dice-pool";
import {
  resolveDieAction,
  runRound,
  type ActorLike,
  type ClashParticipantRef,
  type CombatLike,
  type ResolvedDie,
  type RoundDie,
} from "../round/loop";
import type { CourageKnight, CourageTestOutcome } from "../round/courage";
import type { DiceApiLike, MeasureApiLike } from "../combat/clash";

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

/**
 * Assigns a player's rolled faces to that player's knights, round-robin.
 *
 * ENGINE DEFAULT, not a rule. The dice pool is a PLAYER-level resource and
 * any die may activate any of that player's knights -- there is no activation
 * limit and one knight may legally take every action in a round
 * (vault/greathelm/action-economy-per-die-not-per-model.md). Which knight
 * spends which die is the player's choice, every time. Round-robin is a
 * placeholder that spreads the round across the warband so it plays out
 * visibly; it is not an AI and does not claim to be a good one. A real
 * per-die knight picker is the obvious next increment.
 */
export function assignDiceToKnights(
  playerId: string,
  faces: readonly RolledDie[],
  knights: readonly RoundKnight[]
): RoundDie[] {
  if (knights.length === 0) {
    return [];
  }

  return faces.map((rolled, index) => ({
    id: `${playerId}-d${index + 1}`,
    playerId,
    knightId: knights[index % knights.length].id,
    face: rolled.face as DieFace,
  }));
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

function toParticipant(knight: RoundKnight): ClashParticipantRef {
  return { id: knight.id, name: knight.name, token: knight.token, actor: knight.actor };
}

/**
 * The defender for a clash die: an enemy already in base contact
 * (`measure.between(...) === 0` -- GREATHELM has no separate engagement
 * range, see vault/greathelm/base-contact-and-engagement.md).
 *
 * ENGINE DEFAULT on the choice, not on the rule: Bash/Light/Heavy legally
 * REQUIRE base contact, so an enemy out of contact is never a legal target
 * and a die with no contact simply cannot be spent this way. Which of several
 * touching enemies to hit is the attacker's choice; the nearest (first at
 * distance 0) stands in for a target picker.
 */
export function findDefenderInBaseContact(
  attacker: RoundKnight,
  knights: readonly RoundKnight[],
  measure: MeasureApiLike
): RoundKnight | undefined {
  const enemy = nearestEnemy(attacker, knights, measure);

  return enemy && enemy.distance === 0 ? enemy.knight : undefined;
}

export interface RunRoundFromControlOptions {
  knights: readonly RoundKnight[];
  combat: CombatDocumentLike;
  dice: DiceApiLike;
  measure: MeasureApiLike;
  /** Kickstarter-only floor; off unless the world setting says otherwise. */
  minDicePoolFloorEnabled?: boolean;
  /** Seam for the initiative winner's first-or-second choice. See resolveFirstPlayer. */
  chooseOrder?: (winnerId: string) => "first" | "second";
  notify?: (message: string) => void;
}

export interface RoundControlResult {
  firstPlayerId: string;
  tieRerolls: number;
  poolSizes: Map<string, number>;
  order: ResolvedDie[];
  movements: MovementPlan[];
  courageOutcomes: Map<string, CourageTestOutcome>;
  /** The knight order actually written to the Combat document. */
  persistedOrder: string[];
}

/**
 * Runs one full GREATHELM round: gather -> roll pools (knights + 1) ->
 * determine initiative on most 6s (re-rolling an exact tie) -> battle phase
 * 6->1 -> courage phase -> persist the order.
 *
 * Note what is NOT here: the QSR's optional "re-roll any dice that are not
 * 6's, once" (vault/greathelm/initiative-phase.md) is a per-die player
 * decision with no automatable default -- skipping it costs a player an
 * option, whereas guessing at it would spend their dice for them. Left out
 * deliberately; it needs the same picker UI as the seams above.
 */
export async function runRoundFromControl(
  options: RunRoundFromControlOptions
): Promise<RoundControlResult> {
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
        knightsOfSide(knights, playerId).length,
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

  const winnerId =
    initiative.outcome.result === "tie" ? playerAId : initiative.outcome.playerId;
  const firstPlayerId = resolveFirstPlayer(
    initiative.outcome,
    sides,
    options.chooseOrder ? options.chooseOrder(winnerId) : "first"
  );

  const roundDice: RoundDie[] = sides.flatMap((playerId) =>
    assignDiceToKnights(
      playerId,
      initiative.pools.get(playerId) ?? [],
      knightsOfSide(knights, playerId)
    )
  );

  const byId = new Map(knights.map((knight) => [knight.id, knight]));

  // The courage phase reads these objects AFTER the battle phase (runRound
  // calls runCouragePhase last), so they are kept live: each clash below
  // syncs the view from the Actor the wound was just written to. Snapshotting
  // damage here instead would test courage against pre-battle wounds.
  const courageViews = new Map<string, CourageKnight>(
    knights.map((knight) => [
      knight.id,
      {
        id: knight.id,
        ownerId: knight.playerId,
        damage: knight.actor.system?.damage ?? 0,
        inBaseContactWithEnemy: nearestEnemy(knight, knights, measure)?.distance === 0,
      },
    ])
  );

  const syncCourageView = (knight: RoundKnight): void => {
    const view = courageViews.get(knight.id);

    if (!view) {
      return;
    }

    view.damage = knight.actor.system?.damage ?? view.damage;
    view.inBaseContactWithEnemy = nearestEnemy(knight, knights, measure)?.distance === 0;
  };

  const warbandsKnights = new Map<string, CourageKnight[]>(
    sides.map((playerId) => [
      playerId,
      knightsOfSide(knights, playerId)
        .map((knight) => courageViews.get(knight.id))
        .filter((view): view is CourageKnight => view !== undefined),
    ])
  );

  const movements: MovementPlan[] = [];

  const result = await runRound({
    dice: roundDice,
    firstPlayerId,
    playerIds: sides,
    // A plain object: runRound's writeRoundOrderToCombatFlags mutates it
    // in-memory. See the setFlag call below for why that is not the end of it.
    combat: {},
    onActivate: async (die) => {
      const actor = byId.get(die.knightId);

      if (!actor) {
        return;
      }

      const movement = planMovement(die, actor, knights, measure);

      if (movement) {
        movements.push(movement);
        options.notify?.(
          `${actor.name ?? actor.id}: ${die.action} up to ${movement.moveInches}"`
        );

        return;
      }

      const defender = findDefenderInBaseContact(actor, knights, measure);

      if (!defender) {
        // Bash/Light/Heavy require base contact (QSR p1). No contact, no legal
        // spend -- skipped rather than resolved at range, which would be wrong.
        options.notify?.(
          `${actor.name ?? actor.id}: ${die.action} has no enemy in base contact -- die not spent`
        );

        return;
      }

      await resolveDieAction(die, toParticipant(actor), {
        measure,
        dice,
        defender: toParticipant(defender),
      });

      syncCourageView(actor);
      syncCourageView(defender);
    },
    courage: { dice, warbandsKnights },
  });

  // loop.ts's writeRoundOrderToCombatFlags assigns to a plain `flags` object;
  // on a real Combat document that write does not reach the database, so
  // nothing would survive a reload. Persisting here, at the call site, via the
  // document's own setFlag is the fix that stays inside this sub-spec's
  // pathspec -- loop.ts is not ours to edit. If that function is ever fixed in
  // place, this call becomes redundant, not wrong (same scope, key, value).
  const persistedOrder = result.order.map((die) => die.knightId);
  await combat.setFlag("battleframe", "order", persistedOrder);

  return {
    firstPlayerId,
    tieRerolls: initiative.rerolls,
    poolSizes,
    order: result.order,
    movements,
    courageOutcomes: result.courageOutcomes,
    persistedOrder,
  };
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
  const notify = globalScope.ui?.notifications?.[level];

  if (notify) {
    notify(message);

    return;
  }

  console.log(`${MODULE_ID} | ${message}`);
}

function minDicePoolFloorEnabled(): boolean {
  return resolveGame()?.settings?.get(MODULE_ID, SETTING_MIN_DICE_POOL_FLOOR_ENABLED) === true;
}

/**
 * The scene control's click handler: runs one full round for the GM.
 *
 * GM-only, and checked here rather than only on the button's visibility. A
 * round rolls dice, writes wounds to Actors, and writes turn order to the
 * Combat document -- all shared state a player must not be able to mutate,
 * and a hidden button is not an access control.
 */
export async function onRoundControlActivated(): Promise<RoundControlResult | undefined> {
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

  try {
    const result = await runRoundFromControl({
      knights,
      combat,
      dice,
      measure,
      minDicePoolFloorEnabled: minDicePoolFloorEnabled(),
      notify: (message) => notifyUser(message),
    });

    notifyUser(
      `${localize("battleframe-greathelm.controls.round.complete")} ` +
        `(${result.order.length} dice, first: ${result.firstPlayerId}` +
        `${result.tieRerolls > 0 ? `, tie re-rolls: ${result.tieRerolls}` : ""})`
    );

    return result;
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
    control.tools = [tool];
    controls.push(control);

    return;
  }

  if (controls && typeof controls === "object") {
    control.tools = { [tool.name]: tool };
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

import {
  ATTACK_TYPES,
  DEFAULT_RANGE_INCHES,
  MODULE_ID,
  UNIT_ACTOR_TYPE,
  type AttackType
} from "../constants";
import { isUnitDestroyed } from "../data/unit-state";
import { attackTargetFor, performAttack, type AttackOutcome, type AttackUnit } from "../combat/attack";
import { isInRange, nearestEnemy, type MeasureApiLike } from "../combat/range";
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
  /** Display name for chat/notifications; falls back to the id when absent. */
  name?: string;
  actor: AttackUnit["actor"] & { system?: { move?: number } };
}

/** A readable label for a unit -- its name, or the id when a test omits one. */
function label(unit: RoundControlUnit): string {
  return unit.name ?? unit.id;
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
    return isInRange(distance, reach);
  });
}

/** Whether `unit` is a living enemy of `attacker` -- a legal thing to attack. */
export function isAttackableEnemy(attacker: RoundControlUnit, unit: RoundControlUnit): boolean {
  return unit.playerId !== attacker.playerId && unit.id !== attacker.id && !isUnitDestroyed(unit.actor);
}

/**
 * The unit `attacker` will attack: the GM's explicit target if it is a living
 * enemy, otherwise the nearest living enemy. Never the attacker itself or a
 * friendly unit, however the GM's Foundry targeting happens to be set -- a stale
 * self-target made a unit attack itself live, and this is the guard, now
 * testable outside a canvas. Returns null when no enemy is available.
 */
export function selectAttackTarget(
  attacker: RoundControlUnit,
  explicitTargets: readonly RoundControlUnit[],
  allUnits: readonly RoundControlUnit[],
  measure: MeasureApiLike | undefined
): RoundControlUnit | null {
  const explicit = explicitTargets.find((u) => isAttackableEnemy(attacker, u));
  if (explicit) {
    return explicit;
  }

  const enemies = allUnits.filter((u) => isAttackableEnemy(attacker, u));
  if (measure && enemies.length > 0) {
    return nearestEnemy(attacker, enemies, measure)?.enemy ?? null;
  }

  return null;
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
      notify(`${label(attacker)}: ${attack.refused}`, "warn");
    } else {
      notify(
        `${label(attacker)} ${type} vs ${label(target)}: ${attack.hits} hit(s), ` +
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

/* ------------------------------------------------------------------------ *
 * Foundry glue -- the canvas/UI half, kept apart from the testable core above.
 *
 * >>> UNVERIFIED against a live Foundry v14. <<< The scene-control payload shape
 * and the selected/targeted-token reads are feature-detected and accommodate
 * both known idioms, the same posture (and the same HUMAN REVIEW debt) as
 * GREATHELM's round control. Nothing here is exercised by the unit suite; the
 * check is a GM starting and playing a round in a live world.
 * ------------------------------------------------------------------------ */

const UNIT_TYPE = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;

function globalScope(): {
  game?: {
    user?: { isGM?: boolean; targets?: Set<{ id?: string; actor?: unknown }> };
    battleframe?: { dice?: DiceApiLike; measure?: MeasureApiLike };
  };
  canvas?: { tokens?: { controlled?: unknown[]; placeables?: unknown[] }; scene?: unknown };
  ui?: { notifications?: Record<string, ((m: string) => void) | undefined> };
  Hooks?: { on: (event: string, cb: (...args: unknown[]) => void) => void };
} {
  return globalThis as never;
}

export function isGM(): boolean {
  return globalScope().game?.user?.isGM === true;
}

function notifyUser(message: string, level: "info" | "warn" | "error" = "info"): void {
  const notifications = globalScope().ui?.notifications;
  if (typeof notifications?.[level] === "function") {
    notifications[level]?.(message);
    return;
  }
  console.log(`${MODULE_ID} | ${message}`);
}

/** Which side a unit fights for, from its token disposition -- Foundry's own two-sided split. */
export function sideFromDisposition(disposition: number | undefined): string {
  return (disposition ?? 0) < 0 ? "hostile" : "friendly";
}

interface CanvasTokenLike {
  id?: string;
  center?: { x: number; y: number };
  scene?: unknown;
  document?: { id?: string; disposition?: number };
  actor?: (RoundControlUnit["actor"] & { id?: string; name?: string; type?: string }) | null;
}

/** Builds a `RoundControlUnit` from a canvas token, or null if it is not one of our units. */
function unitFromToken(placeable: CanvasTokenLike): RoundControlUnit | null {
  const actor = placeable.actor;
  if (!actor || actor.type !== UNIT_TYPE) {
    return null;
  }

  const id = actor.id ?? placeable.document?.id ?? placeable.id;
  if (!id) {
    return null;
  }

  return {
    id,
    name: actor.name ?? id,
    playerId: sideFromDisposition(placeable.document?.disposition),
    // Centre-to-centre needs only the centre and the scene; no base flags.
    token: { center: placeable.center, scene: placeable.scene ?? globalScope().canvas?.scene },
    actor
  };
}

export function gatherUnitsFromCanvas(): RoundControlUnit[] {
  const placeables = (globalScope().canvas?.tokens?.placeables ?? []) as CanvasTokenLike[];
  return placeables.map(unitFromToken).filter((unit): unit is RoundControlUnit => unit !== null);
}

/** Centre-to-centre distance between two units, in scene units, via the core measure service. */
function distanceInches(a: RoundControlUnit, b: RoundControlUnit): number {
  const measure = globalScope().game?.battleframe?.measure;
  if (!measure) {
    return Number.POSITIVE_INFINITY;
  }
  return measure.between(a.token, b.token, "centre-to-centre").distance;
}

// The round lives between control clicks. Module-scoped, GM-only, one per world.
let activeRound: SkirmishRound | undefined;
let activeUnits: RoundControlUnit[] = [];

/** "Run Round": rolls initiative and opens a round for the GM to play unit by unit. */
export async function runRoundControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }

  // A round in progress is not silently thrown away. Clicking "Run Round" again
  // mid-round would abandon the current one (units still to activate) and start
  // over with fresh initiative -- a footgun a GM hits by reflex. A round clears
  // itself the moment its last unit activates, so once it is finished this guard
  // is gone and the next round starts normally.
  if (activeRound && !activeRound.isComplete()) {
    notifyUser(localize("controls.round.inProgress"), "warn");
    return;
  }

  const dice = globalScope().game?.battleframe?.dice;
  if (!dice) {
    notifyUser(localize("controls.round.noApi"), "error");
    return;
  }

  const units = gatherUnitsFromCanvas();
  if (units.length === 0) {
    notifyUser(localize("controls.round.noUnits"), "warn");
    return;
  }

  try {
    const { round, firstPlayerId } = await beginRound({ units, dice });
    activeRound = round;
    activeUnits = units;
    notifyUser(format("controls.round.started", { player: firstPlayerId }));
  } catch (error) {
    notifyUser(error instanceof Error ? error.message : String(error), "error");
  }
}

/**
 * "Activate Unit": activates the selected friendly unit against the targeted
 * enemy (Foundry targeting), with the first legal attack type. Movement is the
 * GM's to apply on the canvas; this resolves the attack and advances the turn.
 */
export async function activateSelectedControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }
  if (!activeRound) {
    notifyUser(localize("controls.activate.noRound"), "warn");
    return;
  }

  const dice = globalScope().game?.battleframe?.dice;
  if (!dice) {
    notifyUser(localize("controls.round.noApi"), "error");
    return;
  }

  const controlled = (globalScope().canvas?.tokens?.controlled ?? []) as CanvasTokenLike[];
  const attacker = controlled.map(unitFromToken).find((u): u is RoundControlUnit => u !== null);
  if (!attacker) {
    notifyUser(localize("controls.activate.noSelection"), "warn");
    return;
  }

  // The GM's explicit Foundry target (if a living enemy), else the nearest
  // enemy. `selectAttackTarget` owns that rule -- and the never-attack-yourself
  // guard the live self-attack exposed.
  const explicitTargets = ([...(globalScope().game?.user?.targets ?? [])] as CanvasTokenLike[])
    .map(unitFromToken)
    .filter((u): u is RoundControlUnit => u !== null);
  const target = selectAttackTarget(
    attacker,
    explicitTargets,
    activeUnits,
    globalScope().game?.battleframe?.measure
  );

  const type = target
    ? legalAttackTypes(attacker, distanceInches(attacker, target))[0] ?? null
    : null;

  if (target && type === null) {
    notifyUser(localize("controls.activate.noLegalAttack"), "warn");
  }

  try {
    const result = await resolveActivation({
      round: activeRound,
      attacker,
      target: type ? target : null,
      type,
      dice,
      units: activeUnits,
      notify: notifyUser
    });

    if (result.roundComplete) {
      activeRound = undefined;
      activeUnits = [];
    }
  } catch (error) {
    notifyUser(error instanceof Error ? error.message : String(error), "warn");
  }
}

function localize(suffix: string): string {
  const g = globalThis as unknown as { game?: { i18n?: { localize?: (k: string) => string } } };
  const key = `${MODULE_ID}.${suffix}`;
  return g.game?.i18n?.localize?.(key) ?? key;
}

function format(suffix: string, data: Record<string, string | number>): string {
  const g = globalThis as unknown as {
    game?: { i18n?: { format?: (k: string, d: Record<string, string | number>) => string } };
  };
  const key = `${MODULE_ID}.${suffix}`;
  return g.game?.i18n?.format?.(key, data) ?? key;
}

/**
 * The scene-control entry. Accommodates both known `getSceneControlButtons`
 * payload shapes (array of controls with array tools; keyed record of both) and
 * asserts neither -- see the UNVERIFIED note at the top of the glue.
 */
export function addSceneControl(controls: unknown): void {
  const gm = isGM();
  const runTool = {
    name: "simple-skirmish-run-round",
    title: "battleframe-simple-skirmish.controls.round.tool",
    icon: "fas fa-flag",
    button: true,
    visible: gm,
    order: 0,
    onClick: () => void runRoundControl(),
    onChange: () => void runRoundControl()
  };
  const activateTool = {
    name: "simple-skirmish-activate",
    title: "battleframe-simple-skirmish.controls.activate.tool",
    icon: "fas fa-hand-fist",
    button: true,
    visible: gm,
    order: 1,
    onClick: () => void activateSelectedControl(),
    onChange: () => void activateSelectedControl()
  };

  const control = {
    name: MODULE_ID,
    title: "battleframe-simple-skirmish.controls.round.title",
    icon: "fas fa-chess-board",
    layer: "tokens",
    visible: gm,
    order: 0,
    activeTool: runTool.name,
    tools: {} as Record<string, unknown> | unknown[]
  };

  if (Array.isArray(controls)) {
    control.tools = [runTool, activateTool];
    controls.push(control);
    return;
  }

  if (controls && typeof controls === "object") {
    control.tools = { [runTool.name]: runTool, [activateTool.name]: activateTool };
    (controls as Record<string, unknown>)[MODULE_ID] = control;
  }
}

/** Registers the scene control. Needs nothing from core -- it answers Foundry's own hook. */
export function registerRoundControl(): void {
  const hooks = globalScope().Hooks;
  if (!hooks) {
    return;
  }
  hooks.on("getSceneControlButtons", (...args: unknown[]) => addSceneControl(args[0]));
}

/** Test-only: clears the module-scoped active round between cases. */
export function _resetActiveRoundForTests(): void {
  activeRound = undefined;
  activeUnits = [];
}

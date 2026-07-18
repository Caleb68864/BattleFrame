import { INX_DIE_SIZE, MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";
import type { DiceApiLike } from "../combat/resolve";
import { isDestroyed, type UnitSystemData } from "../data/unit-state";
import { resolveUnitAttack, type AttackFlowResult } from "../round/attack-flow";
import { SUPPRESSED_STATUS } from "../status";

/**
 * The activation control's testable core (top of file) plus the Foundry glue
 * (bottom). The core composes the engine's rounds service, the initiative
 * roll-off, and the attack flow into the sequence a GM drives: run a round,
 * then activate a unit against a target, until every unit has acted and the
 * scenario's elimination default decides it.
 *
 * SCOPE (v0.1): initiative is a d10 roll-off (low wins) standing in for the
 * secret command-card selection; every unit activates in the main tier via the
 * engine's count-weighted bag draw (priority orders and the CP economy are a
 * later layer); attacks default to no-cover (line-of-sight/cover detection is
 * deferred). None of that changes the combat math -- it is all faithfully in
 * `resolveUnitAttack` -- it is the interactive shell that is staged.
 */

export interface RoundControlUnit {
  id: string;
  name?: string;
  sideId: string;
  actor: {
    system: UnitSystemData;
    update?: (changes: Record<string, unknown>) => Promise<unknown>;
  };
}

/** The serializable activation-order state persisted on the Combat document. */
interface ActivationOrderStateLike {
  firstSideId: string;
  activatedIds: string[];
  priorityPointer: number;
  mainPointer: number;
  cachedMainSide?: string;
}

/** Minimal structural view of the engine's rounds service (game.battleframe.rounds). */
interface ActivationOrderLike {
  activeSideId(): string | undefined;
  activate(unitId: string): void;
  isComplete(): boolean;
  serialize(): ActivationOrderStateLike;
}

interface ActivationUnitLike {
  id: string;
  sideId: string;
  isResolved?: () => boolean;
  hasPriority?: () => boolean;
}

interface RoundsApiLike {
  createActivationOrder(params: {
    units: readonly ActivationUnitLike[];
    firstSideId: string;
    selectMain?: (sides: readonly string[], counts: Record<string, number>) => string;
  }): ActivationOrderLike;
  restoreActivationOrder(params: {
    units: readonly ActivationUnitLike[];
    selectMain?: (sides: readonly string[], counts: Record<string, number>) => string;
    state: ActivationOrderStateLike;
  }): ActivationOrderLike;
  weightedBagSelector(
    rng: () => number
  ): (sides: readonly string[], counts: Record<string, number>) => string;
}

function label(unit: RoundControlUnit): string {
  return unit.name ?? unit.id;
}

export class InitiativeUnresolvedError extends Error {
  constructor(rerolls: number) {
    super(`${MODULE_ID} | initiative stayed tied after ${rerolls} re-rolls`);
    this.name = "InitiativeUnresolvedError";
  }
}

export class IllegalActivationError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalActivationError";
  }
}

export const MAX_INITIATIVE_REROLLS = 5;

/**
 * Initiative: one d10 per side, LOWER wins (INX low-goes-first), the whole set
 * re-rolled on a tie. A stand-in for the command-card reveal; the low-wins
 * comparison and the roll-off tie-break are the rulebook's own.
 */
export async function rollInitiativeInx(
  sideIds: readonly string[],
  dice: DiceApiLike,
  maxRerolls: number = MAX_INITIATIVE_REROLLS
): Promise<{ firstSideId: string; rerolls: number }> {
  for (let rerolls = 0; rerolls <= maxRerolls; rerolls += 1) {
    const rolls: Array<{ sideId: string; roll: number }> = [];
    for (const sideId of sideIds) {
      const result = await dice.roll(
        `1d${INX_DIE_SIZE}`,
        {},
        { rulesetId: MODULE_ID, flavor: `initiative (${sideId})` }
      );
      rolls.push({ sideId, roll: result.total });
    }

    let best: { sideId: string; roll: number } | undefined;
    let tied = false;
    for (const entry of rolls) {
      if (!best || entry.roll < best.roll) {
        best = entry;
        tied = false;
      } else if (entry.roll === best.roll) {
        tied = true;
      }
    }

    if (best && !tied) {
      return { firstSideId: best.sideId, rerolls };
    }
  }

  throw new InitiativeUnresolvedError(maxRerolls);
}

export interface BeginRoundParams {
  units: readonly RoundControlUnit[];
  dice: DiceApiLike;
  roundsApi: RoundsApiLike;
  /** RNG for the bag draw; defaults to Math.random in the live glue. */
  rng?: () => number;
  maxRerolls?: number;
}

export interface BeginRoundResult {
  order: ActivationOrderLike;
  firstSideId: string;
  rerolls: number;
}

/** Rolls initiative and builds the activation order (bag draw), destroyed units dropping out live. */
export async function beginRound(params: BeginRoundParams): Promise<BeginRoundResult> {
  const { units, dice, roundsApi } = params;
  const sideIds = distinct(units.map((unit) => unit.sideId));
  const { firstSideId, rerolls } = await rollInitiativeInx(sideIds, dice, params.maxRerolls);

  const order = roundsApi.createActivationOrder({
    units: units.map((unit) => ({
      id: unit.id,
      sideId: unit.sideId,
      isResolved: () => isDestroyed(unit.actor.system)
    })),
    firstSideId,
    selectMain: roundsApi.weightedBagSelector(params.rng ?? Math.random)
  });

  return { order, firstSideId, rerolls };
}

export type VictoryOutcome =
  | { result: "winner"; sideId: string }
  | { result: "draw" }
  | { result: "continue" };

/**
 * The default elimination victory read: the side still holding models wins once
 * the other is wiped. INX's real scoring is scenario-defined; this is the
 * baseline "last side standing" that every scenario at least agrees on.
 */
export function checkVictoryInx(units: readonly RoundControlUnit[]): VictoryOutcome {
  const livingSides = distinct(
    units.filter((unit) => !isDestroyed(unit.actor.system)).map((unit) => unit.sideId)
  );

  if (livingSides.length === 1) {
    return { result: "winner", sideId: livingSides[0] };
  }
  if (livingSides.length === 0) {
    return { result: "draw" };
  }
  return { result: "continue" };
}

export interface ResolveActivationParams {
  order: ActivationOrderLike;
  attacker: RoundControlUnit;
  target: RoundControlUnit | null;
  /** Which of the attacker's weapons fires (default 0). */
  weaponIndex?: number;
  /** Whether the target is in cover (default false; cover detection is deferred). */
  inCover?: boolean;
  dice: DiceApiLike;
  units: readonly RoundControlUnit[];
  applyState?: (
    unit: RoundControlUnit,
    state: { modelsRemaining: number; suppressed: boolean }
  ) => void | Promise<void>;
  notify?: (message: string, level?: "info" | "warn") => void;
}

export interface ActivationResult {
  attack?: AttackFlowResult;
  roundComplete: boolean;
  victory?: VictoryOutcome;
}

/**
 * Activates `attacker` -- resolving its attack on `target` if one is declared --
 * then advances the order. When that was the last activation, reads victory.
 * Throws if it is not this side's turn; the engine order is the single authority
 * on turn legality.
 */
export async function resolveActivation(params: ResolveActivationParams): Promise<ActivationResult> {
  const { order, attacker, target, dice, units } = params;
  const notify = params.notify ?? (() => undefined);

  if (order.activeSideId() !== attacker.sideId) {
    throw new IllegalActivationError(
      `it is not ${attacker.sideId}'s turn to activate (expected ${order.activeSideId() ?? "no one"})`
    );
  }

  let attack: AttackFlowResult | undefined;
  const weapon = attacker.actor.system.weapons?.[params.weaponIndex ?? 0];

  if (target && weapon) {
    attack = await resolveUnitAttack({
      dice,
      attacker: attacker.actor.system,
      weapon,
      target: target.actor.system,
      inCover: params.inCover ?? false,
      flavorPrefix: label(attacker)
    });

    await params.applyState?.(target, {
      modelsRemaining: attack.targetModelsAfter,
      suppressed: target.actor.system.suppressed || attack.suppressed
    });

    notify(
      `${label(attacker)} vs ${label(target)}: ${attack.attack.hits} hit(s)` +
        (attack.attack.destroyed ? ", model down" : "") +
        (attack.suppressed ? " -- target suppressed" : "") +
        (attack.targetDestroyed ? ` -- ${label(target)} wiped` : "")
    );
  } else if (target && !weapon) {
    notify(`${label(attacker)} has no weapon to attack with.`, "warn");
  }

  order.activate(attacker.id);

  if (!order.isComplete()) {
    return { attack, roundComplete: false };
  }

  const victory = checkVictoryInx(units);
  if (victory.result === "winner") {
    notify(`Round over: ${victory.sideId} holds the field.`);
  } else if (victory.result === "draw") {
    notify("Round over: no models remain on either side.", "warn");
  } else {
    notify("Round over: both sides still hold. Start a new round.");
  }

  return { attack, roundComplete: true, victory };
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/* ------------------------------------------------------------------------ *
 * Foundry glue -- the canvas/UI half, kept apart from the testable core.
 *
 * >>> UNVERIFIED against a live Foundry v14. <<< The scene-control payload shape
 * and the selected/targeted-token reads are feature-detected and accommodate
 * both known idioms, the same posture as the other rulesets' round controls.
 * Nothing here is exercised by the unit suite; the check is a GM playing a round
 * in a live world.
 * ------------------------------------------------------------------------ */

const UNIT_TYPE = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;

function globalScope(): {
  game?: {
    user?: { isGM?: boolean; targets?: Set<unknown> };
    battleframe?: { dice?: DiceApiLike; rounds?: RoundsApiLike };
    i18n?: { localize?: (k: string) => string; format?: (k: string, d: Record<string, unknown>) => string };
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

/** Which side a unit fights for, from its token disposition. */
export function sideFromDisposition(disposition: number | undefined): string {
  return (disposition ?? 0) < 0 ? "hostile" : "friendly";
}

interface CanvasTokenLike {
  id?: string;
  scene?: { id?: string };
  document?: { id?: string; disposition?: number };
  actor?:
    | (RoundControlUnit["actor"] & { id?: string; name?: string; type?: string })
    | null;
}

/** A gathered unit plus the token/scene ids needed to seat it as a Combatant. */
interface CanvasUnit extends RoundControlUnit {
  tokenId?: string;
  sceneId?: string;
}

function unitFromToken(placeable: CanvasTokenLike): CanvasUnit | null {
  const actor = placeable.actor;
  if (!actor || actor.type !== UNIT_TYPE) {
    return null;
  }
  const id = actor.id ?? placeable.document?.id ?? placeable.id;
  if (!id) {
    return null;
  }
  const scene = placeable.scene ?? (globalScope().canvas as { scene?: { id?: string } })?.scene;
  return {
    id,
    name: actor.name ?? id,
    sideId: sideFromDisposition(placeable.document?.disposition),
    actor,
    tokenId: placeable.document?.id ?? placeable.id,
    sceneId: scene?.id
  };
}

export function gatherUnitsFromCanvas(): CanvasUnit[] {
  const placeables = (globalScope().canvas?.tokens?.placeables ?? []) as CanvasTokenLike[];
  return placeables.map(unitFromToken).filter((unit): unit is CanvasUnit => unit !== null);
}

/* ---- Combat-document-backed round state (roadmap P0) ------------------- */

const FLAG_SCOPE = "battleframe";
const ROUND_FLAG = "round";
const ORDER_FLAG = "order";

interface CombatantLike {
  id?: string;
  tokenId?: string;
}

interface CombatLike {
  id?: string;
  combatants: Iterable<CombatantLike> & { contents?: CombatantLike[] };
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
  unsetFlag(scope: string, key: string): Promise<unknown>;
  createEmbeddedDocuments(name: string, data: Record<string, unknown>[]): Promise<CombatantLike[]>;
  startCombat?(): Promise<unknown>;
}

function combatScope(): {
  game?: { combat?: CombatLike | null; combats?: { active?: CombatLike | null; contents?: CombatLike[] } };
  Combat?: { create(data: Record<string, unknown>): Promise<CombatLike> };
  canvas?: { scene?: { id?: string } };
} {
  return globalThis as never;
}

function iterateCombatants(combat: CombatLike): CombatantLike[] {
  if (Array.isArray(combat.combatants)) {
    return combat.combatants as CombatantLike[];
  }
  const c = combat.combatants as { contents?: CombatantLike[] };
  return c?.contents ?? [...(combat.combatants ?? [])];
}

function activeRoundCombat(): CombatLike | undefined {
  const g = combatScope().game;
  const candidates = [g?.combat, g?.combats?.active, ...(g?.combats?.contents ?? [])];
  for (const c of candidates) {
    if (c && c.getFlag?.(FLAG_SCOPE, ROUND_FLAG)) {
      return c;
    }
  }
  return undefined;
}

async function getOrCreateCombat(): Promise<CombatLike | undefined> {
  const scope = combatScope();
  const existing = scope.game?.combat ?? scope.game?.combats?.active ?? undefined;
  if (existing) {
    return existing;
  }
  return scope.Combat?.create ? scope.Combat.create({ scene: scope.canvas?.scene?.id }) : undefined;
}

async function ensureCombatants(combat: CombatLike, units: readonly CanvasUnit[]): Promise<void> {
  const seated = new Set(iterateCombatants(combat).map((c) => c.tokenId).filter(Boolean) as string[]);
  const toCreate = units
    .filter((u) => u.tokenId && !seated.has(u.tokenId))
    .map((u) => ({
      tokenId: u.tokenId,
      sceneId: u.sceneId,
      actorId: (u.actor as { id?: string })?.id,
      hidden: false
    }));
  if (toCreate.length > 0 && combat.createEmbeddedDocuments) {
    await combat.createEmbeddedDocuments("Combatant", toCreate);
  }
}

function orderFlag(combat: CombatLike, units: readonly CanvasUnit[]): string[] {
  const byToken = new Map<string, string>();
  for (const c of iterateCombatants(combat)) {
    if (c.tokenId && c.id) {
      byToken.set(c.tokenId, c.id);
    }
  }
  return units
    .map((u) => (u.tokenId ? byToken.get(u.tokenId) : undefined))
    .filter((id): id is string => id !== undefined);
}

/** The engine activation-unit list (with live isResolved) the order needs. */
function toActivationUnits(units: readonly RoundControlUnit[]): ActivationUnitLike[] {
  return units.map((u) => ({
    id: u.id,
    sideId: u.sideId,
    isResolved: () => isDestroyed(u.actor.system)
  }));
}

function readRoundState(combat: CombatLike | undefined): ActivationOrderStateLike | undefined {
  return combat?.getFlag(FLAG_SCOPE, ROUND_FLAG) as ActivationOrderStateLike | undefined;
}

async function applyStateToActor(
  unit: RoundControlUnit,
  state: { modelsRemaining: number; suppressed: boolean }
): Promise<void> {
  await unit.actor.update?.({
    "system.modelsRemaining": state.modelsRemaining,
    "system.suppressed": state.suppressed
  });

  // Surface the state on the token via Foundry status effects: a suppressed
  // marker, and the core "defeated" skull when the unit is wiped. This makes
  // battlefield state visible + synced instead of an invisible system boolean.
  const actor = unit.actor as {
    toggleStatusEffect?: (id: string, opts?: { active?: boolean }) => Promise<unknown>;
  };
  const defeated =
    (globalThis as unknown as { CONFIG?: { specialStatusEffects?: { DEFEATED?: string } } }).CONFIG
      ?.specialStatusEffects?.DEFEATED ?? "dead";
  await actor.toggleStatusEffect?.(SUPPRESSED_STATUS, { active: state.suppressed });
  await actor.toggleStatusEffect?.(defeated, { active: state.modelsRemaining <= 0 });
}

/** "Run Round": rolls initiative and opens a round for the GM to play unit by unit. */
export async function runRoundControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }

  const dice = globalScope().game?.battleframe?.dice;
  const roundsApi = globalScope().game?.battleframe?.rounds;
  if (!dice || !roundsApi) {
    notifyUser(localize("controls.round.noApi"), "error");
    return;
  }

  // "In progress" is read off the Combat document, so it survives a reload.
  const existing = activeRoundCombat();
  const existingState = readRoundState(existing);
  if (existingState) {
    const round = roundsApi.restoreActivationOrder({
      units: toActivationUnits(gatherUnitsFromCanvas()),
      selectMain: roundsApi.weightedBagSelector(Math.random),
      state: existingState
    });
    if (!round.isComplete()) {
      notifyUser(localize("controls.round.inProgress"), "warn");
      return;
    }
  }

  const units = gatherUnitsFromCanvas();
  if (units.length === 0) {
    notifyUser(localize("controls.round.noUnits"), "warn");
    return;
  }

  try {
    const { order, firstSideId } = await beginRound({ units, dice, roundsApi });
    const combat = existing ?? (await getOrCreateCombat());
    if (!combat) {
      notifyUser(localize("controls.round.noApi"), "error");
      return;
    }
    await ensureCombatants(combat, units);
    await combat.setFlag(FLAG_SCOPE, ORDER_FLAG, orderFlag(combat, units));
    await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, order.serialize());
    if (combat.startCombat) {
      try {
        await combat.startCombat();
      } catch {
        /* already started -- fine */
      }
    }
    notifyUser(format("controls.round.started", { side: firstSideId }));
  } catch (error) {
    notifyUser(error instanceof Error ? error.message : String(error), "error");
  }
}

/** "Activate Unit": activates the selected unit against the targeted enemy. */
export async function activateSelectedControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }

  const roundsApi = globalScope().game?.battleframe?.rounds;
  const combat = activeRoundCombat();
  const state = readRoundState(combat);
  if (!combat || !state || !roundsApi) {
    notifyUser(localize("controls.activate.noRound"), "warn");
    return;
  }

  const dice = globalScope().game?.battleframe?.dice;
  if (!dice) {
    notifyUser(localize("controls.round.noApi"), "error");
    return;
  }

  const units = gatherUnitsFromCanvas();
  const controlled = (globalScope().canvas?.tokens?.controlled ?? []) as CanvasTokenLike[];
  const attacker = controlled.map(unitFromToken).find((u): u is CanvasUnit => u !== null);
  if (!attacker) {
    notifyUser(localize("controls.activate.noSelection"), "warn");
    return;
  }

  const explicitTargets = ([...(globalScope().game?.user?.targets ?? [])] as CanvasTokenLike[])
    .map(unitFromToken)
    .filter((u): u is CanvasUnit => u !== null);
  const target =
    explicitTargets.find(
      (u) => u.sideId !== attacker.sideId && !isDestroyed(u.actor.system)
    ) ?? null;

  const order = roundsApi.restoreActivationOrder({
    units: toActivationUnits(units),
    selectMain: roundsApi.weightedBagSelector(Math.random),
    state
  });

  try {
    const result = await resolveActivation({
      order,
      attacker,
      target,
      dice,
      units,
      applyState: applyStateToActor,
      notify: notifyUser
    });

    // Persist the advanced order back onto the Combat document.
    await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, order.serialize());
    if (result.roundComplete) {
      await combat.unsetFlag(FLAG_SCOPE, ROUND_FLAG);
    }
  } catch (error) {
    notifyUser(error instanceof Error ? error.message : String(error), "warn");
  }
}

function localize(suffix: string): string {
  const key = `${MODULE_ID}.${suffix}`;
  return globalScope().game?.i18n?.localize?.(key) ?? key;
}

function format(suffix: string, data: Record<string, unknown>): string {
  const key = `${MODULE_ID}.${suffix}`;
  return globalScope().game?.i18n?.format?.(key, data) ?? key;
}

/** The scene-control entry, accommodating both known payload shapes. */
export function addSceneControl(controls: unknown): void {
  const gm = isGM();
  const runTool = {
    name: "incountry-run-round",
    title: "battleframe-incountry.controls.round.tool",
    icon: "fas fa-flag",
    button: true,
    visible: gm,
    order: 0,
    onClick: () => void runRoundControl(),
    onChange: () => void runRoundControl()
  };
  const activateTool = {
    name: "incountry-activate",
    title: "battleframe-incountry.controls.activate.tool",
    icon: "fas fa-crosshairs",
    button: true,
    visible: gm,
    order: 1,
    onClick: () => void activateSelectedControl(),
    onChange: () => void activateSelectedControl()
  };

  const control = {
    name: MODULE_ID,
    title: "battleframe-incountry.controls.round.title",
    icon: "fas fa-helmet-safety",
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

export function registerRoundControl(): void {
  const hooks = globalScope().Hooks;
  if (!hooks) {
    return;
  }
  hooks.on("getSceneControlButtons", (...args: unknown[]) => addSceneControl(args[0]));
}

/**
 * Test-only, now a no-op: the round is no longer module-scoped state (it lives on
 * the Combat document). Kept so existing tests' cleanup calls still resolve.
 */
export function _resetActiveRoundForTests(): void {
  /* round state lives on the Combat document now -- nothing module-scoped to clear */
}

import { tr } from "../i18n";
import { MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";
import { requireDieSize } from "../settings";
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
  /** The side's units that may activate now (not activated, not resolved, priority tier honoured). */
  eligible?(sideId: string): string[];
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

/* ------------------------------------------------------------------------ *
 * Attack-outcome chat card (pure, unit-tested).
 *
 * A persistent ChatMessage card is the CLAUDE.md-mandated surface for a
 * result (not a GM-only toast). The card's CONTENT is built here, UI-free, so
 * it is testable without a running Foundry; the live glue below hands the
 * assembled parts to the engine's `game.battleframe.chat.postCard`.
 * ------------------------------------------------------------------------ */

/** The ruleset accent class layered onto the engine's base `battleframe-card`. */
const ATTACK_REPORT_CLASS = "incountry-attack-report";

/**
 * Escapes the five HTML-significant characters. Unit names are user-editable, so
 * they must be escaped before landing in card markup. Mirrors the engine's
 * `chat.escapeHtml`; declared locally so the pure builder needs no running
 * Foundry (the same live/fallback split the card wrapper uses).
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface AttackReportNames {
  attacker: string;
  target: string;
}

/**
 * The card's title + body lines. `attacker`/`target` are escaped here; the
 * lines mix that escaped text with safe static markup. This is the single
 * source of truth for the card's content -- both the live `postCard` seam and
 * the tested `buildAttackReportHtml` renderer read it.
 */
function attackReportParts(
  result: AttackFlowResult,
  names: AttackReportNames
): { title: string; lines: string[] } {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);
  const a = result.attack;

  const lines: string[] = [
    `<p>${tr("report.hits", `<strong>${a.hits}</strong> hit(s) &middot; <strong>${a.damage}</strong> damage.`, {
      hits: a.hits,
      damage: a.damage
    })}</p>`
  ];
  if (a.hits > 0) {
    const data = { armor: a.armorTotal, damage: a.damage };
    lines.push(
      `<p>${
        a.destroyed
          ? tr("report.armorDestroyed", `Armor ${a.armorTotal} vs ${a.damage} &mdash; model destroyed.`, data)
          : tr("report.armorHolds", `Armor ${a.armorTotal} vs ${a.damage} &mdash; model holds.`, data)
      }</p>`
    );
  }
  if (a.destroyed && !result.targetDestroyed) {
    const left = result.targetModelsAfter;
    lines.push(`<p>${tr("report.modelDown", `Model down &mdash; ${left} model(s) left.`, { left })}</p>`);
  }
  if (result.suppressionRoll !== undefined) {
    const roll = result.suppressionRoll;
    lines.push(
      result.suppressed
        ? `<p class="inx-suppressed">${tr(
            "report.suppressed",
            `Suppression check ${roll}: <strong>${target} suppressed.</strong>`,
            { roll, target }
          )}</p>`
        : `<p>${tr("report.suppressionHolds", `Suppression check ${roll}: ${target} holds.`, { roll, target })}</p>`
    );
  }
  if (result.targetDestroyed) {
    lines.push(`<p class="inx-wiped"><strong>${tr("report.wiped", `${target} wiped out.`, { target })}</strong></p>`);
  }

  return { title: `${attacker} &rarr; ${target}`, lines };
}

/**
 * Wraps a title + body lines in the outcome-card container. Delegates to the
 * engine's neutral `chat.card()` when the runtime services are present (so all
 * rulesets share one card shape + stylesheet), falling back to the engine
 * card's markup inline for the no-engine unit-test path -- the same live/fallback
 * split the other rulesets use. The accent class rides along either way.
 */
function wrapCard(title: string, lines: string[]): string {
  const card = globalScope().game?.battleframe?.chat?.card;
  if (card) {
    return card({ title, lines, cssClass: ATTACK_REPORT_CLASS });
  }
  return (
    `<div class="battleframe-card ${ATTACK_REPORT_CLASS}">` +
    `<h3 class="battleframe-card__title">${title}</h3>${lines.join("")}</div>`
  );
}

/**
 * Builds the chat-card HTML summarising one unit's attack on another: the
 * heading (attacker &rarr; target), hits/damage, the armor check, any model
 * loss, suppression, and a wipe notice. Pure + exported so the exact markup
 * (classes, content, name-escaping) is unit-tested; it renders the same card
 * the live flow posts through the engine.
 */
export function buildAttackReportHtml(
  result: AttackFlowResult,
  names: AttackReportNames
): string {
  const { title, lines } = attackReportParts(result, names);
  return wrapCard(title, lines);
}

/** The round-over card. Side ids reach it as user-editable text, so they are escaped. */
function victorySpec(victory: ReturnType<typeof checkVictoryInx>): AttackCardSpec {
  let line: string;
  if (victory.result === "winner") {
    const side = escapeHtml(victory.sideId);
    line = `<p>${tr("report.winner", `<strong>${side}</strong> holds the field.`, { side })}</p>`;
  } else if (victory.result === "draw") {
    line = `<p>${tr("report.draw", "No models remain on either side.")}</p>`;
  } else {
    line = `<p>${tr("report.continue", "Both sides still hold. Start a new round.")}</p>`;
  }
  return { title: tr("report.roundOver", "Round over"), lines: [line], cssClass: "incountry-victory" };
}

/** A card spec the pure flow hands to the injected postCard seam. */
export interface AttackCardSpec {
  title: string;
  lines: readonly string[];
  cssClass: string;
}

export class InitiativeUnresolvedError extends Error {
  constructor(rerolls: number) {
    super(`${MODULE_ID} | ${tr("errors.initiativeUnresolved", `initiative stayed tied after ${rerolls} re-rolls`, { rerolls })}`);
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
        `1d${requireDieSize()}`,
        {},
        { rulesetId: MODULE_ID, flavor: tr("dice.initiative", `initiative (${sideId})`, { side: sideId }) }
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
  // A side with no models left is out of the battle: it does not roll initiative.
  const sideIds = distinct(units.filter((unit) => !isDestroyed(unit.actor.system)).map((unit) => unit.sideId));
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
  /**
   * Posts a persistent attack-outcome card. Injected seam (default no-op) so the
   * pure flow stays UI-free; the Foundry glue wires it to
   * `game.battleframe.chat.postCard`.
   */
  postCard?: (spec: AttackCardSpec) => void | Promise<void>;
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
  const postCard = params.postCard ?? (() => undefined);

  if (order.activeSideId() !== attacker.sideId) {
    const expected = order.activeSideId() ?? tr("errors.noOne", "no one");
    throw new IllegalActivationError(
      tr("errors.notYourTurn", `it is not ${attacker.sideId}'s turn to activate (expected ${expected})`, {
        side: attacker.sideId,
        expected
      })
    );
  }
  // Ask the order BEFORE the attack: `activate` below would refuse an activated or
  // wiped unit, but only after its attack had rolled and its damage was saved.
  if (order.eligible && !order.eligible(attacker.sideId).includes(attacker.id)) {
    throw new IllegalActivationError(tr("errors.cannotActivate", `${label(attacker)} cannot activate now`, { unit: label(attacker) }));
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

    const names = { attacker: label(attacker), target: label(target), hits: attack.attack.hits };
    notify(
      tr("notify.attack", `${names.attacker} vs ${names.target}: ${names.hits} hit(s)`, names) +
        (attack.attack.destroyed ? tr("notify.modelDown", ", model down") : "") +
        (attack.suppressed ? tr("notify.targetSuppressed", " -- target suppressed") : "") +
        (attack.targetDestroyed ? tr("notify.targetWiped", ` -- ${names.target} wiped`, names) : "")
    );

    // Persistent outcome card (survives reload, syncs to every client) in
    // addition to the transient toast above.
    const parts = attackReportParts(attack, {
      attacker: label(attacker),
      target: label(target)
    });
    await postCard({ ...parts, cssClass: ATTACK_REPORT_CLASS });
  } else if (target && !weapon) {
    notify(tr("notify.noWeapon", `${label(attacker)} has no weapon to attack with.`, { unit: label(attacker) }), "warn");
  }

  order.activate(attacker.id);

  if (!order.isComplete()) {
    return { attack, roundComplete: false };
  }

  const victory = checkVictoryInx(units);
  if (victory.result === "winner") {
    notify(tr("notify.roundWinner", `Round over: ${victory.sideId} holds the field.`, { side: victory.sideId }));
  } else if (victory.result === "draw") {
    notify(tr("notify.roundDraw", "Round over: no models remain on either side."), "warn");
  } else {
    notify(tr("notify.roundContinue", "Round over: both sides still hold. Start a new round."));
  }
  // The persistent record of how the round ended; the toast only reaches this client.
  await postCard(victorySpec(victory));

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

/** Minimal structural view of the engine's chat service (game.battleframe.chat). */
interface ChatApiLike {
  card(spec: { title?: string; lines?: readonly string[]; cssClass?: string }): string;
  postCard(spec: {
    title?: string;
    lines?: readonly string[];
    cssClass?: string;
  }): Promise<void>;
}

function globalScope(): {
  game?: {
    user?: { isGM?: boolean; targets?: Set<unknown> };
    battleframe?: { dice?: DiceApiLike; rounds?: RoundsApiLike; chat?: ChatApiLike };
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
  // The token, not the actor: unlinked tokens of one actor share the actor's id,
  // and would collapse into a single unit in the activation order.
  const id = placeable.document?.id ?? placeable.id ?? actor.id;
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

/**
 * What a round advance reports (the engine's `AdvanceOutcome` shape). Returned rather
 * than toasted, so a ready-driven advance delegated to a GM reaches every player.
 */
export interface AdvanceOutcome {
  message: string;
  level: "info" | "warn" | "error";
}

/** "Run Round" (GM manual): gate, then run the ungated round-advance. */
export async function runRoundControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }
  const outcome = await advanceRoundCore();
  notifyUser(outcome.message, outcome.level);
}

/**
 * The round-advance work, UNGATED: roll initiative and open a fresh round for the
 * table to play unit by unit (refusing while a round is still in progress). This
 * is what the player-driven ready countdown runs (on the host client) as well as
 * the GM's manual Run Round tool, so a GM-less table advances the game itself.
 * Registered as the engine's advance callback via
 * `game.battleframe.advance.registerAdvance` (see main.ts).
 */
export async function advanceRoundCore(): Promise<AdvanceOutcome> {
  const dice = globalScope().game?.battleframe?.dice;
  const roundsApi = globalScope().game?.battleframe?.rounds;
  if (!dice || !roundsApi) {
    return { message: localize("controls.round.noApi"), level: "error" };
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
      return { message: localize("controls.round.inProgress"), level: "warn" };
    }
  }

  const units = gatherUnitsFromCanvas();
  if (units.length === 0) {
    return { message: localize("controls.round.noUnits"), level: "warn" };
  }
  // The module's victory read: once one side (or neither) holds the field, a new
  // round has nothing to play.
  if (checkVictoryInx(units).result !== "continue") {
    return { message: localize("controls.round.battleOver"), level: "warn" };
  }

  try {
    const { order, firstSideId } = await beginRound({ units, dice, roundsApi });
    const combat = existing ?? (await getOrCreateCombat());
    if (!combat) {
      return { message: localize("controls.round.noApi"), level: "error" };
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
    return { message: format("controls.round.started", { side: firstSideId }), level: "info" };
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error), level: "error" };
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
    const chat = globalScope().game?.battleframe?.chat;
    const result = await resolveActivation({
      order,
      attacker,
      target,
      dice,
      units,
      applyState: applyStateToActor,
      notify: notifyUser,
      // Post the persistent outcome card through the engine's neutral chat
      // service, which wraps the parts in the shared `battleframe-card` and
      // renders it as a ChatMessage.
      postCard: chat ? (spec) => chat.postCard(spec) : undefined
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

/**
 * Ready tool (every player): toggle "ready to advance". When all players are
 * ready the engine runs a settable countdown and then advances the round
 * (`advanceRoundCore`) with no GM needed. Un-readying cancels the countdown.
 */
export async function readyAction(): Promise<void> {
  const advance = (globalScope().game as unknown as { battleframe?: { advance?: AdvanceApiLike } })?.battleframe?.advance;
  if (!advance?.toggleReady) {
    notifyUser(localize("controls.round.noApi"), "warn");
    return;
  }
  await advance.toggleReady();
  const status = advance.status?.();
  notifyUser(
    format("controls.ready.status", {
      state: advance.isReady?.() ? tr("notify.ready", "READY") : tr("notify.notReady", "not ready"),
      ready: status?.ready?.length ?? 0,
      total: status?.participants?.length ?? 0
    })
  );
}

/** Whether the current user is marked ready (for the toggle button's state). */
function currentUserReady(): boolean {
  const advance = (globalScope().game as unknown as { battleframe?: { advance?: AdvanceApiLike } })?.battleframe?.advance;
  return advance?.isReady?.() === true;
}

/** Minimal structural view of the engine's ready-advance service (game.battleframe.advance). */
interface AdvanceApiLike {
  toggleReady?: () => Promise<void>;
  isReady?: (userId?: string) => boolean;
  status?: () => { ready: string[]; participants: string[]; allReady: boolean };
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
  // Ready-to-advance toggle: when every player is ready, the round advances on a
  // settable countdown -- no GM needed. Visible to every player (unlike the GM
  // Run/Activate tools), and first so it is the default tool.
  const readyTool = {
    name: "incountry-ready",
    title: "battleframe-incountry.controls.ready.tool",
    icon: "fas fa-hourglass-half",
    toggle: true,
    active: currentUserReady(),
    visible: true,
    order: 0,
    onChange: () => void readyAction()
  };
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
    // Visible to every player so the Ready toggle reaches them; the Run/Activate
    // tools inside stay GM-only via their own `visible: gm`.
    visible: true,
    order: 0,
    activeTool: readyTool.name,
    tools: {} as Record<string, unknown> | unknown[]
  };

  if (Array.isArray(controls)) {
    control.tools = [readyTool, runTool, activateTool];
    controls.push(control);
    return;
  }
  if (controls && typeof controls === "object") {
    control.tools = {
      [readyTool.name]: readyTool,
      [runTool.name]: runTool,
      [activateTool.name]: activateTool
    };
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

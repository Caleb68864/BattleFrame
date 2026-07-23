import {
  ATTACK_TYPES,
  DEFAULT_RANGE_INCHES,
  MODULE_ID,
  UNIT_ACTOR_TYPE,
  type AttackType
} from "../constants";
import { isUnitDestroyed } from "../data/unit-state";
import {
  attackTargetFor,
  performAttack,
  type AttackApplied,
  type AttackOutcome,
  type AttackUnit
} from "../combat/attack";
import { isInRange, nearestEnemy, type MeasureApiLike } from "../combat/range";
import type { DiceApiLike } from "../combat/resolve";
import {
  createSkirmishRound,
  determineFirstPlayer,
  isSkirmishRoundResumable,
  restoreSkirmishRound,
  type SkirmishRound,
  type SkirmishRoundState,
  type SkirmishUnit
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

/* ------------------------------------------------------------------------ *
 * Persistent chat cards -- the pure, unit-tested half.
 *
 * Combat is surfaced as persistent ChatMessage CARDS (the CLAUDE.md-mandated
 * result surface), not just transient GM-only toasts. The card HTML is built by
 * pure functions here (no Foundry, no canvas) so the exact markup -- names,
 * outcome, and the `battleframe-card`/`ss-*` classes -- is pinned by unit tests.
 * The dynamic parts (user-editable unit names) are HTML-escaped; the runtime
 * posting goes through the engine's `game.battleframe.chat.postCard` seam wired
 * in the Foundry glue below.
 * ------------------------------------------------------------------------ */

/**
 * Escapes the five HTML-significant characters -- unit names are user-editable,
 * so they must never reach a chat card as live markup (XSS). The engine owns the
 * canonical copy (`game.battleframe.chat.escapeHtml`), but the pure builders run
 * with NO engine present (unit tests), so this local copy keeps them testable --
 * the same live/fallback split the engine card delegation uses below.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A neutral chat-card spec (title + pre-built body lines + ruleset accent class). */
interface CardSpec {
  title?: string;
  lines?: readonly string[];
  cssClass?: string;
}

/** The engine's chat service (game.battleframe.chat), read live at runtime. */
interface ChatServiceLike {
  card?: (spec: CardSpec) => string;
  postCard?: (spec: CardSpec) => void | Promise<void>;
  escapeHtml?: (value: string) => string;
}

function chatService(): ChatServiceLike | undefined {
  const scope = globalThis as unknown as {
    game?: { battleframe?: { chat?: ChatServiceLike } };
    battleframe?: { chat?: ChatServiceLike };
  };
  return scope.game?.battleframe?.chat ?? scope.battleframe?.chat;
}

/**
 * Renders a card spec to HTML. Delegates to the engine's neutral `chat.card()`
 * when the runtime services are present (so every ruleset shares one card shape +
 * stylesheet), falling back to that card's identical markup inline for the
 * no-engine unit-test path -- the same live/fallback split the round-control glue
 * uses for i18n. The `ss-*` accent class rides along either way.
 */
function renderCard(spec: CardSpec): string {
  const card = chatService()?.card;
  if (card) {
    return card(spec);
  }
  const classes = ["battleframe-card", spec.cssClass].filter(Boolean).join(" ");
  const title = spec.title ? `<h3 class="battleframe-card__title">${spec.title}</h3>` : "";
  return `<div class="${classes}">${title}${(spec.lines ?? []).join("")}</div>`;
}

export interface CombatReportNames {
  attacker: string;
  defender: string;
  type: AttackType;
}

/** The combat-outcome card spec: attacker vs defender, hits, models removed, kill. */
function combatReportSpec(result: AttackApplied, names: CombatReportNames): CardSpec {
  const attacker = escapeHtml(names.attacker);
  const defender = escapeHtml(names.defender);
  const lines = [
    `<p><strong>${result.hits}</strong> hit(s), <strong>${result.modelsRemoved}</strong> model(s) removed.</p>`
  ];
  if (result.destroyed) {
    lines.push(`<p class="ss-destroyed"><strong>${defender} destroyed.</strong></p>`);
  }
  return {
    title: `${attacker} ${names.type} &rarr; ${defender}`,
    lines,
    cssClass: "ss-combat-report"
  };
}

/** The round-over card spec: who won, or a draw / play-on outcome. */
function victorySpec(victory: VictoryOutcome): CardSpec {
  let line: string;
  if (victory.result === "winner") {
    line = `<p><strong>${escapeHtml(victory.playerId)} wins</strong> &mdash; no enemy models remain.</p>`;
  } else if (victory.result === "draw") {
    line = `<p>A draw &mdash; no models remain on either side.</p>`;
  } else {
    line = `<p>Both sides still hold the field. Start a new round.</p>`;
  }
  return { title: "Round over", lines: [line], cssClass: "ss-victory" };
}

/** Builds the persistent combat-outcome card HTML (attacker vs defender, hits, kills). */
export function buildCombatReportHtml(result: AttackApplied, names: CombatReportNames): string {
  return renderCard(combatReportSpec(result, names));
}

/** Builds the persistent round-over / victory card HTML. */
export function buildVictoryHtml(victory: VictoryOutcome): string {
  return renderCard(victorySpec(victory));
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
  /**
   * Posts a persistent chat card (a combat report, a round-over card). Default
   * no-op so the pure resolution stays UI-free; the Foundry glue wires the real
   * `game.battleframe.chat.postCard`.
   */
  postCard?: (spec: CardSpec) => void | Promise<void>;
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
  const postCard = params.postCard ?? (() => undefined);

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
      // The persistent record of the exchange: a combat-outcome chat card.
      await postCard(combatReportSpec(attack, { attacker: label(attacker), defender: label(target), type }));
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
  // The persistent record of how the round ended: a round-over / victory card.
  await postCard(victorySpec(victory));

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

/** The engine's player-driven, GM-less advance service (game.battleframe.advance). */
interface AdvanceApiLike {
  toggleReady?: () => Promise<void>;
  isReady?: (userId?: string) => boolean;
  status?: () => { ready: string[]; participants: string[]; allReady: boolean };
  registerAdvance?: (fn: () => void | Promise<void>) => void;
}

function globalScope(): {
  game?: {
    user?: { isGM?: boolean; targets?: Set<{ id?: string; actor?: unknown }> };
    battleframe?: { dice?: DiceApiLike; measure?: MeasureApiLike; advance?: AdvanceApiLike };
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

/** A gathered unit plus the token/scene ids needed to seat it as a Combatant. */
interface CanvasUnit extends RoundControlUnit {
  tokenId?: string;
  sceneId?: string;
}

/** Builds a `CanvasUnit` from a canvas token, or null if it is not one of our units. */
function unitFromToken(placeable: CanvasTokenLike): CanvasUnit | null {
  const actor = placeable.actor;
  if (!actor || actor.type !== UNIT_TYPE) {
    return null;
  }

  const id = actor.id ?? placeable.document?.id ?? placeable.id;
  if (!id) {
    return null;
  }

  const scene = (placeable.scene ?? globalScope().canvas?.scene) as { id?: string } | undefined;
  return {
    id,
    name: actor.name ?? id,
    playerId: sideFromDisposition(placeable.document?.disposition),
    // Centre-to-centre needs only the centre and the scene; no base flags.
    token: { center: placeable.center, scene },
    actor,
    tokenId: placeable.document?.id ?? placeable.id,
    sceneId: scene?.id
  };
}

export function gatherUnitsFromCanvas(): CanvasUnit[] {
  const placeables = (globalScope().canvas?.tokens?.placeables ?? []) as CanvasTokenLike[];
  return placeables.map(unitFromToken).filter((unit): unit is CanvasUnit => unit !== null);
}

/** Centre-to-centre distance between two units, in scene units, via the core measure service. */
function distanceInches(a: RoundControlUnit, b: RoundControlUnit): number {
  const measure = globalScope().game?.battleframe?.measure;
  if (!measure) {
    return Number.POSITIVE_INFINITY;
  }
  return measure.between(a.token, b.token, "centre-to-centre").distance;
}

/* ---- Combat-document-backed round state -------------------------------- *
 * The round is NOT a module variable. It lives on the `Combat` document: the
 * serialized round state as a flag, the units as real `Combatant`s. It is
 * reconstructed on every control click, so a GM reload mid-round keeps the
 * round, other clients see it, and the native tracker renders the roster. See
 * docs/roadmap-foundry-integration.md P0.
 * ----------------------------------------------------------------------- */

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
  const c = combat.combatants as { contents?: CombatantLike[] };
  if (Array.isArray(combat.combatants)) {
    return combat.combatants as CombatantLike[];
  }
  return c?.contents ?? [...(combat.combatants ?? [])];
}

/** The combat currently holding one of our rounds, or undefined. */
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

/** The active combat, or a new one created on the current scene. */
async function getOrCreateCombat(): Promise<CombatLike | undefined> {
  const scope = combatScope();
  const existing = scope.game?.combat ?? scope.game?.combats?.active ?? undefined;
  if (existing) {
    return existing;
  }
  return scope.Combat?.create ? scope.Combat.create({ scene: scope.canvas?.scene?.id }) : undefined;
}

/** Seats each unit token as a Combatant (skipping tokens already in the combat). */
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

/** Combatant ids in unit order, for the tracker's `order` flag. */
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

/** The SkirmishUnit list (with live isDestroyed) the round machine needs. */
function toSkirmishUnits(units: readonly RoundControlUnit[]): SkirmishUnit[] {
  return units.map((u) => ({
    id: u.id,
    playerId: u.playerId,
    isDestroyed: () => isUnitDestroyed(u.actor)
  }));
}

/** Reads the persisted round state off the combat, if any. */
function readRoundState(combat: CombatLike | undefined): SkirmishRoundState | undefined {
  return combat?.getFlag(FLAG_SCOPE, ROUND_FLAG) as SkirmishRoundState | undefined;
}

/** "Run Round": rolls initiative and opens a round for the GM to play unit by unit. */
export async function runRoundControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }
  await advanceRoundCore();
}

/**
 * The round-advance work, UNGATED (no GM check): roll initiative and open the
 * next round on the Combat document. This is what the player-driven ready
 * countdown runs on the host client -- so a GM-less table advances to the next
 * round itself -- as well as the GM's manual Run Round tool. Registered as the
 * engine's advance callback via `game.battleframe.advance.registerAdvance`. A
 * round still in progress is respected: advancing only opens a fresh round once
 * the current one's every unit has acted.
 */
export async function advanceRoundCore(): Promise<void> {
  // A round in progress is not silently thrown away (a footgun a GM hits by
  // reflex). The check now reads the persisted state off the Combat document, so
  // it survives a reload -- a round is "in progress" until its last unit acts.
  const existing = activeRoundCombat();
  const existingState = readRoundState(existing);
  // A stale flag whose first player controls no current unit (its tokens were
  // deleted between sessions) cannot be restored -- restoreSkirmishRound would
  // throw, and since this resume branch runs on every "Run Round" click that
  // throw would permanently brick the tool. So only restore a RESUMABLE flag;
  // an unresumable one is ignored here and falls through to a fresh round below
  // (which overwrites the stale flag). Behaviour is unchanged when it IS
  // resumable -- the in-progress guard still fires.
  if (existingState && isSkirmishRoundResumable(toSkirmishUnits(gatherUnitsFromCanvas()), existingState)) {
    const round = restoreSkirmishRound(toSkirmishUnits(gatherUnitsFromCanvas()), existingState);
    if (!round.isComplete()) {
      notifyUser(localize("controls.round.inProgress"), "warn");
      return;
    }
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
    const combat = existing ?? (await getOrCreateCombat());
    if (!combat) {
      notifyUser(localize("controls.round.noApi"), "error");
      return;
    }
    await ensureCombatants(combat, units);
    await combat.setFlag(FLAG_SCOPE, ORDER_FLAG, orderFlag(combat, units));
    await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, round.serialize());
    if (combat.startCombat) {
      try {
        await combat.startCombat();
      } catch {
        /* already started -- fine */
      }
    }
    notifyUser(format("controls.round.started", { player: firstPlayerId }));
  } catch (error) {
    notifyUser(error instanceof Error ? error.message : String(error), "error");
  }
}

/**
 * "Activate Unit": activates the selected friendly unit against the targeted
 * enemy (Foundry targeting), with the first legal attack type. The round is
 * reconstructed from the Combat document, advanced, and persisted back.
 */
export async function activateSelectedControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }

  const combat = activeRoundCombat();
  const state = readRoundState(combat);
  if (!combat || !state) {
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
  const target = selectAttackTarget(
    attacker,
    explicitTargets,
    units,
    globalScope().game?.battleframe?.measure
  );

  const type = target
    ? legalAttackTypes(attacker, distanceInches(attacker, target))[0] ?? null
    : null;

  if (target && type === null) {
    notifyUser(localize("controls.activate.noLegalAttack"), "warn");
  }

  // Same stale-flag guard as advanceRoundCore: if the persisted first player
  // controls none of the current units, restoreSkirmishRound would throw
  // (outside the try below). Treat it as no restorable round rather than crash.
  if (!isSkirmishRoundResumable(toSkirmishUnits(units), state)) {
    notifyUser(localize("controls.activate.noRound"), "warn");
    return;
  }

  const round = restoreSkirmishRound(toSkirmishUnits(units), state);

  try {
    const result = await resolveActivation({
      round,
      attacker,
      target: type ? target : null,
      type,
      dice,
      units,
      notify: notifyUser,
      // Persistent chat cards ride the engine's neutral chat service. No-ops when
      // it is absent (early boot), same posture as the notify seam above.
      postCard: (spec) => chatService()?.postCard?.(spec)
    });

    // Persist the advanced round back onto the Combat document.
    await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, round.serialize());
    if (result.roundComplete) {
      await combat.unsetFlag(FLAG_SCOPE, ROUND_FLAG);
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
 * Ready tool (every player): toggle "ready to advance the round". When all active
 * players are ready the engine runs a settable countdown and then advances the
 * round (`advanceRoundCore`) on the host client -- no GM needed. Un-readying
 * cancels the countdown.
 */
export async function readyAction(): Promise<void> {
  const advance = globalScope().game?.battleframe?.advance;
  if (!advance?.toggleReady) {
    notifyUser(localize("controls.ready.noApi"), "warn");
    return;
  }
  await advance.toggleReady();
  const status = advance.status?.();
  notifyUser(
    format("controls.ready.status", {
      state: advance.isReady?.() ? "READY" : "not ready",
      ready: status?.ready?.length ?? 0,
      total: status?.participants?.length ?? 0
    })
  );
}

/** Whether the current user is marked ready (for the toggle button's state). */
function currentUserReady(): boolean {
  return globalScope().game?.battleframe?.advance?.isReady?.() === true;
}

/**
 * The scene-control entry. Accommodates both known `getSceneControlButtons`
 * payload shapes (array of controls with array tools; keyed record of both) and
 * asserts neither -- see the UNVERIFIED note at the top of the glue.
 */
export function addSceneControl(controls: unknown): void {
  const gm = isGM();
  // Ready-to-advance toggle: when all players are ready, the round advances on a
  // countdown -- no GM needed. Visible to every player (the control itself is too).
  const readyTool = {
    name: "simple-skirmish-ready",
    title: "battleframe-simple-skirmish.controls.ready.tool",
    icon: "fas fa-hourglass-half",
    toggle: true,
    active: currentUserReady(),
    visible: true,
    order: 0,
    onChange: () => void readyAction()
  };
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
    // Visible to every player so the Ready toggle is reachable in GM-less play;
    // the GM-only Run/Activate tools stay individually gated (`visible: gm`).
    visible: true,
    order: 0,
    activeTool: runTool.name,
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

/** Registers the scene control. Needs nothing from core -- it answers Foundry's own hook. */
export function registerRoundControl(): void {
  const hooks = globalScope().Hooks;
  if (!hooks) {
    return;
  }
  hooks.on("getSceneControlButtons", (...args: unknown[]) => addSceneControl(args[0]));
}

/**
 * Test-only, now a no-op: the round is no longer module-scoped state (it lives on
 * the Combat document). Kept so existing tests' `beforeEach` calls still resolve.
 */
export function _resetActiveRoundForTests(): void {
  /* round state lives on the Combat document now -- nothing module-scoped to clear */
}

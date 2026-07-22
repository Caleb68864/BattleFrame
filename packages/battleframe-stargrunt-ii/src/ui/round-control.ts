import { MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";
import type { DieType } from "../dice/ladder";
import { computeFirepowerDie, resolveDispersedFire, type DiceApiLike, type DispersedFireOutcome } from "../combat/fire";
import { rangeDieFromDistance } from "../combat/range";
import { placeSuppression } from "../round/suppression";
import { isUnitWiped, syncUnitStatuses } from "../status";
import {
  beginNextTurn,
  createStargruntRound,
  firstActivator,
  restoreStargruntRound,
  type StargruntRoundState,
  type StargruntUnit
} from "../round/session";
import type { Figure } from "../combat/casualties";

/**
 * The Stargrunt II activation control: a testable core (top) that composes the
 * pure fire engine + session into the sequence a table drives, and the Foundry
 * glue (bottom) that reads selection/targets, measures, prompts the GM for
 * cover + line-of-fire, and posts the persistent outcome card.
 *
 * The round/turn state is NEVER a module variable — it lives on the Combat
 * document (`flags.battleframe.round`, a serialized `StargruntRoundState`), so a
 * reload resumes the turn instead of restarting it.
 */

const UNIT_TYPE = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;
const FLAG_SCOPE = "battleframe";
const ROUND_FLAG = "round";

/* ------------------------------------------------------------------------ *
 * Fire-outcome chat card (pure, unit-tested).
 * ------------------------------------------------------------------------ */

/** The ruleset accent class layered onto the engine's base `battleframe-card`. */
export const FIRE_REPORT_CLASS = "stargrunt-ii-fire-report";

/** Escapes the five HTML-significant chars — mirrors the engine's `chat.escapeHtml`. */
function escapeHtmlLocal(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface FireReportNames {
  attacker: string;
  target: string;
}

export interface FireReportMeta {
  rangeDie: DieType;
  coverShift: number;
}

/**
 * The fire card's title + body lines. Names are escaped here (via the engine's
 * `escapeHtml` when live, the local mirror otherwise); the lines mix that escaped
 * text with safe static markup. Single source of truth for the card content —
 * both `buildFireReportHtml` and the live `postCard` seam read it.
 */
export function fireReportParts(
  outcome: DispersedFireOutcome,
  names: FireReportNames,
  meta: FireReportMeta
): { title: string; lines: string[] } {
  const esc = globalScope().game?.battleframe?.chat?.escapeHtml ?? escapeHtmlLocal;
  const attacker = esc(names.attacker);
  const target = esc(names.target);

  const tierLabel =
    outcome.tier === "effective" ? "Effective" : outcome.tier === "suppress" ? "Suppression" : "Miss";

  const lines: string[] = [
    `<p>Firer [${outcome.firerFaces.join(", ")}] vs Range ${meta.rangeDie} (${outcome.rangeFace})` +
      (meta.coverShift > 0 ? ` &middot; cover +${meta.coverShift}` : "") +
      `.</p>`,
    `<p><strong>${outcome.beats}</strong> beat(s) &mdash; <strong>${tierLabel}</strong>.</p>`
  ];

  if (outcome.tier === "effective") {
    lines.push(
      `<p>Sum ${outcome.sum} &divide; ${meta.rangeDie} = ${outcome.potentialHits} hit(s)` +
        (outcome.extraHit ? " +1 (remainder)" : "") +
        ` &rarr; <strong>${outcome.hits}</strong> hit(s).</p>`
    );
    const wounds = outcome.impacts.filter((i) => i.result === "wound").length;
    const kills = outcome.impacts.filter((i) => i.result === "kill").length;
    lines.push(`<p><strong>${kills}</strong> killed, <strong>${wounds}</strong> wounded.</p>`);
    if (outcome.wiped) {
      lines.push(`<p class="sg2-wiped"><strong>${target} wiped out.</strong></p>`);
    }
  }
  if (outcome.suppressionApplied) {
    lines.push(`<p class="sg2-suppressed">${target} takes a suppression marker.</p>`);
  }

  return { title: `${attacker} &rarr; ${target}`, lines };
}

/**
 * Wraps title + lines in the outcome card. Delegates to the engine's neutral
 * `chat.card()` when live (so every ruleset shares one card shape + stylesheet),
 * falling back to the engine card's markup inline for the no-engine test path.
 */
function wrapCard(title: string, lines: string[]): string {
  const card = globalScope().game?.battleframe?.chat?.card;
  if (card) {
    return card({ title, lines, cssClass: FIRE_REPORT_CLASS });
  }
  return (
    `<div class="battleframe-card ${FIRE_REPORT_CLASS}">` +
    `<h3 class="battleframe-card__title">${title}</h3>${lines.join("")}</div>`
  );
}

/** Builds the fire-outcome chat-card HTML. Pure + exported so the markup is tested. */
export function buildFireReportHtml(
  outcome: DispersedFireOutcome,
  names: FireReportNames,
  meta: FireReportMeta
): string {
  const { title, lines } = fireReportParts(outcome, names, meta);
  return wrapCard(title, lines);
}

/* ------------------------------------------------------------------------ *
 * Fire action (pure-ish orchestration, injected deps — unit-tested).
 * ------------------------------------------------------------------------ */

export interface UnitSystemLike {
  quality: DieType;
  inPosition?: boolean;
  suppression?: number;
  figures: Figure[];
  weapons: {
    id: string;
    label?: string;
    firepower: number;
    impact: DieType;
    rangeClass?: string;
    isSupport?: boolean;
    supportFpVsInfantry?: DieType;
  }[];
}

export interface FireActorLike {
  name: string;
  system: UnitSystemLike;
  update?: (changes: Record<string, unknown>) => Promise<unknown>;
  toggleStatusEffect?: (id: string, opts?: { active?: boolean }) => Promise<unknown>;
}

export interface FireCardSpec {
  title: string;
  lines: readonly string[];
  cssClass: string;
}

export interface FireActionParams {
  attacker: FireActorLike;
  target: FireActorLike;
  weaponIndex?: number;
  distanceInches: number;
  /** GM-selected cover: 0 none, 1 soft, 2 hard. */
  coverShift: number;
  /** GM-confirmed line of fire (the `los` suggestion is shown in the prompt). */
  losClear: boolean;
  dice: DiceApiLike;
  rng: () => number;
  postCard?: (spec: FireCardSpec) => void | Promise<void>;
  applyState?: (target: FireActorLike, figures: Figure[], suppression: number) => void | Promise<void>;
  notify?: (message: string, level?: "info" | "warn") => void;
}

export type FireActionReason = "no-lof" | "no-weapon" | "no-figures" | "out-of-range";

export interface FireActionResult {
  outcome?: DispersedFireOutcome;
  rangeDie?: DieType;
  reason?: FireActionReason;
}

function livingCount(figures: readonly Figure[]): number {
  return figures.filter((f) => f.status !== "dead").length;
}

/**
 * Resolves one dispersed-fire action end to end: derives the Firepower die from
 * the firing figure count, the Range Die from distance + GM cover + the target's
 * In-Position, runs the pure fire engine, writes the casualties/suppression back
 * to the target, and posts the outcome card. Deps injected so it runs without a
 * live Foundry.
 */
export async function resolveFireAction(params: FireActionParams): Promise<FireActionResult> {
  const notify = params.notify ?? (() => undefined);
  const postCard = params.postCard ?? (() => undefined);
  const { attacker, target } = params;

  if (!params.losClear) {
    notify(localize("controls.fire.noLof"), "warn");
    return { reason: "no-lof" };
  }

  const weapon = attacker.system.weapons?.[params.weaponIndex ?? 0];
  if (!weapon) {
    notify(localize("controls.fire.noWeapon"), "warn");
    return { reason: "no-weapon" };
  }

  const firing = livingCount(attacker.system.figures ?? []);
  if (firing === 0) {
    notify(localize("controls.fire.noWeapon"), "warn");
    return { reason: "no-figures" };
  }

  const rangeDie = rangeDieFromDistance(
    params.distanceInches,
    attacker.system.quality,
    params.coverShift,
    target.system.inPosition === true
  );
  if (rangeDie === "impossible") {
    notify(localize("controls.fire.outOfRange"), "warn");
    return { reason: "out-of-range" };
  }

  const firepowerDie = computeFirepowerDie(weapon.firepower, firing);
  const supportDice = weapon.isSupport && weapon.supportFpVsInfantry ? [weapon.supportFpVsInfantry] : [];
  const targetArmourDie =
    (target.system.figures ?? []).find((f) => f.status !== "dead")?.armour ?? ("d4" as DieType);

  const outcome = await resolveDispersedFire({
    dice: params.dice,
    firerQualityDie: attacker.system.quality,
    firepowerDie,
    supportDice,
    impactDie: weapon.impact,
    rangeDie,
    targetArmourDie,
    targetFigures: target.system.figures ?? [],
    rng: params.rng,
    flavorPrefix: attacker.name
  });

  const suppression = outcome.suppressionApplied
    ? placeSuppression(target.system.suppression ?? 0)
    : target.system.suppression ?? 0;

  await params.applyState?.(target, outcome.figures, suppression);

  const parts = fireReportParts(
    outcome,
    { attacker: attacker.name, target: target.name },
    { rangeDie, coverShift: params.coverShift }
  );
  await postCard({ ...parts, cssClass: FIRE_REPORT_CLASS });

  notify(
    `${attacker.name} → ${target.name}: ${outcome.tier}` +
      (outcome.tier === "effective" ? `, ${outcome.hits} hit(s)` : "") +
      (outcome.wiped ? " — wiped" : "")
  );

  return { outcome, rangeDie };
}

/* ------------------------------------------------------------------------ *
 * Foundry glue — canvas/UI half. >>> UNVERIFIED against a live Foundry v14. <<<
 * Feature-detected reads; nothing here is exercised by the unit suite. The check
 * is a GM playing a turn in a live world (deferred to the coordinator).
 * ------------------------------------------------------------------------ */

interface ChatApiLike {
  escapeHtml(v: string): string;
  card(spec: { title?: string; lines?: readonly string[]; cssClass?: string }): string;
  postCard(spec: { title?: string; lines?: readonly string[]; cssClass?: string }): Promise<void>;
}

interface AdvanceApiLike {
  toggleReady?: () => Promise<void>;
  isReady?: (userId?: string) => boolean;
  status?: () => { ready: string[]; participants: string[]; allReady: boolean };
}

interface SelectionApiLike {
  controlledOne(): unknown | undefined;
  firstTarget(): unknown | undefined;
}

interface MeasureApiLike {
  between(a: unknown, b: unknown, mode?: string): { distance: number };
  fromPlaceable(placeable: unknown): unknown | undefined;
}

interface LosApiLike {
  between(a: unknown, b: unknown, opts?: { sample?: "centre" | "corners" }): { clear: boolean };
}

function globalScope(): {
  game?: {
    user?: { isGM?: boolean };
    battleframe?: {
      dice?: DiceApiLike;
      chat?: ChatApiLike;
      advance?: AdvanceApiLike;
      selection?: SelectionApiLike;
      measure?: MeasureApiLike;
      los?: LosApiLike;
    };
    i18n?: { localize?: (k: string) => string; format?: (k: string, d: Record<string, unknown>) => string };
  };
  canvas?: { tokens?: { placeables?: unknown[] }; scene?: { id?: string } };
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

function localize(suffix: string): string {
  const key = `${MODULE_ID}.${suffix}`;
  return globalScope().game?.i18n?.localize?.(key) ?? key;
}

function format(suffix: string, data: Record<string, unknown>): string {
  const key = `${MODULE_ID}.${suffix}`;
  return globalScope().game?.i18n?.format?.(key, data) ?? key;
}

/** Which side a unit fights for, from its token disposition. */
export function sideFromDisposition(disposition: number | undefined): string {
  return (disposition ?? 0) < 0 ? "hostile" : "friendly";
}

interface CanvasTokenLike {
  id?: string;
  center?: { x: number; y: number };
  bounds?: { x: number; y: number; width: number; height: number };
  scene?: { id?: string };
  document?: { id?: string; disposition?: number };
  actor?: (FireActorLike & { id?: string; type?: string }) | null;
}

interface CanvasUnit {
  id: string;
  name: string;
  sideId: string;
  actor: FireActorLike & { id?: string };
  placeable: CanvasTokenLike;
}

function unitFromToken(placeable: unknown): CanvasUnit | null {
  const p = placeable as CanvasTokenLike | undefined;
  const actor = p?.actor;
  if (!p || !actor || actor.type !== UNIT_TYPE) {
    return null;
  }
  const id = actor.id ?? p.document?.id ?? p.id;
  if (!id) {
    return null;
  }
  return {
    id,
    name: actor.name ?? id,
    sideId: sideFromDisposition(p.document?.disposition),
    actor,
    placeable: p
  };
}

export function gatherUnitsFromCanvas(): CanvasUnit[] {
  const placeables = (globalScope().canvas?.tokens?.placeables ?? []) as unknown[];
  return placeables.map(unitFromToken).filter((u): u is CanvasUnit => u !== null);
}

function toSessionUnits(units: readonly CanvasUnit[]): StargruntUnit[] {
  return units.map((u) => ({
    id: u.id,
    sideId: u.sideId,
    isDestroyed: () => isUnitWiped(u.actor.system)
  }));
}

function countBySide(units: readonly CanvasUnit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const u of units) {
    if (!isUnitWiped(u.actor.system)) {
      counts[u.sideId] = (counts[u.sideId] ?? 0) + 1;
    }
  }
  return counts;
}

/* ---- Combat-document-backed round state -------------------------------- */

interface CombatLike {
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
  startCombat?(): Promise<unknown>;
}

function combatScope(): {
  game?: { combat?: CombatLike | null; combats?: { active?: CombatLike | null; contents?: CombatLike[] } };
  Combat?: { create(data: Record<string, unknown>): Promise<CombatLike> };
  canvas?: { scene?: { id?: string } };
} {
  return globalThis as never;
}

function activeRoundCombat(): CombatLike | undefined {
  const g = combatScope().game;
  const candidates = [g?.combat, g?.combats?.active, ...(g?.combats?.contents ?? [])];
  for (const c of candidates) {
    if (c) {
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

function readRoundState(combat: CombatLike | undefined): StargruntRoundState | undefined {
  return combat?.getFlag(FLAG_SCOPE, ROUND_FLAG) as StargruntRoundState | undefined;
}

/** Rolls a d10 per tied side; the lower roll takes first activation. */
async function resolveTie(sides: readonly string[], dice: DiceApiLike): Promise<string> {
  let best: { side: string; roll: number } | undefined;
  for (const side of sides) {
    const roll = (await dice.roll("1d10", undefined, { rulesetId: MODULE_ID, flavor: `initiative (${side})` })).total;
    if (!best || roll < best.roll) {
      best = { side, roll };
    }
  }
  return best?.side ?? sides[0];
}

async function chooseFirstActivator(units: readonly CanvasUnit[], dice: DiceApiLike): Promise<string> {
  const counts = countBySide(units);
  const first = firstActivator(counts);
  if (first !== "tie") {
    return first;
  }
  return resolveTie(Object.keys(counts), dice);
}

/**
 * The Turn-End / turn-advance behaviour registered through `advance` and fired by
 * the scene button. No round yet → open turn 1 (smaller force first). A completed
 * turn → clear every unit's `activated`, bump the turn track, pick a fresh first
 * activator. A turn still in progress → refuse.
 */
export async function advanceTurnCore(): Promise<void> {
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

  const combat = activeRoundCombat() ?? (await getOrCreateCombat());
  if (!combat) {
    notifyUser(localize("controls.round.noCombat"), "warn");
    return;
  }

  const sessionUnits = toSessionUnits(units);
  const state = readRoundState(combat);

  try {
    if (!state) {
      const firstSide = await chooseFirstActivator(units, dice);
      const round = createStargruntRound(sessionUnits, firstSide);
      await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, round.serialize());
      if (combat.startCombat) {
        try {
          await combat.startCombat();
        } catch {
          /* already started */
        }
      }
      notifyUser(format("controls.round.started", { side: firstSide, turn: 1 }));
      return;
    }

    const round = restoreStargruntRound(sessionUnits, state);
    if (!round.isTurnComplete()) {
      notifyUser(localize("controls.round.inProgress"), "warn");
      return;
    }

    const firstSide = await chooseFirstActivator(units, dice);
    const next = beginNextTurn(state, firstSide);
    for (const u of units) {
      await u.actor.update?.({ "system.activated": false });
    }
    await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, next);
    notifyUser(format("controls.round.nextTurn", { side: firstSide, turn: next.turn }));
  } catch (error) {
    notifyUser(error instanceof Error ? error.message : String(error), "error");
  }
}

/** GM-manual "New Turn / Run" button: gate, then run the ungated advance. */
export async function runRoundControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }
  await advanceTurnCore();
}

/** "Activate Unit": marks the selected unit activated this turn and advances the slot. */
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

  const selection = globalScope().game?.battleframe?.selection;
  const attacker = unitFromToken(selection?.controlledOne());
  if (!attacker) {
    notifyUser(localize("controls.activate.noSelection"), "warn");
    return;
  }

  const round = restoreStargruntRound(toSessionUnits(gatherUnitsFromCanvas()), state);
  try {
    round.activate(attacker.id);
  } catch {
    notifyUser(localize("controls.activate.notYourTurn"), "warn");
    return;
  }

  await attacker.actor.update?.({ "system.activated": true });
  await syncUnitStatuses(attacker.actor);
  await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, round.serialize());
  notifyUser(format("controls.activate.activated", { unit: attacker.name }));
  if (round.isTurnComplete()) {
    notifyUser(localize("controls.round.turnComplete"));
  }
}

/** Builds an `los`-samplable token view from a canvas placeable. */
function sightToken(p: CanvasTokenLike): { center: { x: number; y: number }; bounds?: CanvasTokenLike["bounds"] } | undefined {
  return p.center ? { center: p.center, bounds: p.bounds } : undefined;
}

/**
 * GM cover + line-of-fire prompt. Feature-detected DialogV2; when no dialog is
 * available (headless / unit runs) it proceeds with the engine's LOF suggestion
 * and no cover. UNVERIFIED live.
 */
async function promptFireOptions(losSuggestion: boolean): Promise<{ coverShift: number; proceed: boolean }> {
  const DialogV2 = (globalThis as unknown as {
    foundry?: { applications?: { api?: { DialogV2?: { prompt?: (cfg: unknown) => Promise<unknown> } } } };
  }).foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.prompt) {
    return { coverShift: 0, proceed: losSuggestion };
  }
  try {
    const suggestion = losSuggestion ? localize("controls.fire.lofClear") : localize("controls.fire.lofBlocked");
    const content =
      `<p>${format("controls.fire.lofConfirm", { suggestion })}</p>` +
      `<label>${localize("controls.fire.coverPrompt")} ` +
      `<select name="cover">` +
      `<option value="0">${localize("controls.fire.cover.none")}</option>` +
      `<option value="1">${localize("controls.fire.cover.soft")}</option>` +
      `<option value="2">${localize("controls.fire.cover.hard")}</option>` +
      `</select></label>`;
    const result = (await DialogV2.prompt({
      window: { title: localize("controls.fire.tool") },
      content,
      ok: {
        callback: (_e: unknown, button: { form?: { elements?: Record<string, { value?: string }> } }) =>
          Number(button?.form?.elements?.cover?.value ?? 0)
      }
    })) as number;
    return { coverShift: Number(result) || 0, proceed: true };
  } catch {
    return { coverShift: 0, proceed: false };
  }
}

async function applyFireStateToActor(target: FireActorLike, figures: Figure[], suppression: number): Promise<void> {
  await target.update?.({ "system.figures": figures, "system.suppression": suppression });
  await syncUnitStatuses(target);
}

/** "Fire": resolves a dispersed-fire action from the selected unit at the targeted enemy. */
export async function fireSelectedControl(): Promise<void> {
  if (!isGM()) {
    notifyUser(localize("controls.round.gmOnly"), "warn");
    return;
  }
  const bf = globalScope().game?.battleframe;
  const dice = bf?.dice;
  if (!dice) {
    notifyUser(localize("controls.round.noApi"), "error");
    return;
  }

  const attacker = unitFromToken(bf?.selection?.controlledOne());
  if (!attacker) {
    notifyUser(localize("controls.activate.noSelection"), "warn");
    return;
  }
  const target = unitFromToken(bf?.selection?.firstTarget());
  if (!target || target.sideId === attacker.sideId) {
    notifyUser(localize("controls.fire.noTarget"), "warn");
    return;
  }

  // Base-to-base distance via the engine measure service.
  let distanceInches = 0;
  const mA = bf?.measure?.fromPlaceable(attacker.placeable);
  const mB = bf?.measure?.fromPlaceable(target.placeable);
  if (bf?.measure && mA && mB) {
    distanceInches = bf.measure.between(mA, mB).distance;
  }

  // LOF suggestion from the engine (fails open with no walls); GM confirms.
  const sA = sightToken(attacker.placeable);
  const sB = sightToken(target.placeable);
  const losClear = bf?.los && sA && sB ? bf.los.between(sA, sB, { sample: "corners" }).clear : true;

  const { coverShift, proceed } = await promptFireOptions(losClear);
  if (!proceed) {
    return;
  }

  const chat = bf?.chat;
  await resolveFireAction({
    attacker: attacker.actor,
    target: target.actor,
    distanceInches,
    coverShift,
    losClear: true,
    dice,
    rng: Math.random,
    postCard: chat ? (spec) => chat.postCard(spec) : undefined,
    applyState: applyFireStateToActor,
    notify: notifyUser
  });
}

/** Ready tool (every player): toggle "ready to advance"; all-ready runs a countdown → advance. */
export async function readyAction(): Promise<void> {
  const advance = globalScope().game?.battleframe?.advance;
  if (!advance?.toggleReady) {
    notifyUser(localize("controls.round.noApi"), "warn");
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

function currentUserReady(): boolean {
  return globalScope().game?.battleframe?.advance?.isReady?.() === true;
}

/** The scene-control entry, accommodating both known payload shapes. */
export function addSceneControl(controls: unknown): void {
  const gm = isGM();
  const readyTool = {
    name: "stargrunt-ii-ready",
    title: "battleframe-stargrunt-ii.controls.ready.tool",
    icon: "fas fa-hourglass-half",
    toggle: true,
    active: currentUserReady(),
    visible: true,
    order: 0,
    onChange: () => void readyAction()
  };
  const runTool = {
    name: "stargrunt-ii-run-turn",
    title: "battleframe-stargrunt-ii.controls.round.tool",
    icon: "fas fa-flag",
    button: true,
    visible: gm,
    order: 1,
    onClick: () => void runRoundControl(),
    onChange: () => void runRoundControl()
  };
  const activateTool = {
    name: "stargrunt-ii-activate",
    title: "battleframe-stargrunt-ii.controls.activate.tool",
    icon: "fas fa-person-rifle",
    button: true,
    visible: gm,
    order: 2,
    onClick: () => void activateSelectedControl(),
    onChange: () => void activateSelectedControl()
  };
  const fireTool = {
    name: "stargrunt-ii-fire",
    title: "battleframe-stargrunt-ii.controls.fire.tool",
    icon: "fas fa-crosshairs",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void fireSelectedControl(),
    onChange: () => void fireSelectedControl()
  };

  const control = {
    name: MODULE_ID,
    title: "battleframe-stargrunt-ii.controls.round.title",
    icon: "fas fa-helmet-safety",
    layer: "tokens",
    visible: true,
    order: 0,
    activeTool: readyTool.name,
    tools: {} as Record<string, unknown> | unknown[]
  };

  if (Array.isArray(controls)) {
    control.tools = [readyTool, runTool, activateTool, fireTool];
    controls.push(control);
    return;
  }
  if (controls && typeof controls === "object") {
    control.tools = {
      [readyTool.name]: readyTool,
      [runTool.name]: runTool,
      [activateTool.name]: activateTool,
      [fireTool.name]: fireTool
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

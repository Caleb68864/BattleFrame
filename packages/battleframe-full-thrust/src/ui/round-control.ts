/**
 * The Full Thrust scene-control glue: the user's way into the turn loop. It adds
 * a "Full Thrust" scene control whose tools drive the two mechanical actions --
 * plot a ship's movement order, and fire a ship at a target -- reachable by
 * clicking, so the combat/movement code below survives tree-shaking (this
 * project's recurring "green tests, dead code" failure). Everything above the
 * Foundry glue is injectable and unit-tested; the glue at the bottom answers
 * Foundry's own hooks and reads the live `game.battleframe` services.
 *
 * Sources: FT2 "Sequence of Play" (fire phase), "Movement Orders".
 */

import {
  MODULE_ID,
  FIGHTER_GROUP_ACTOR_TYPE,
  SHIP_ACTOR_TYPE,
  PLOTTED_ORDER_FLAG,
  FIRE_PHASE_FLAG,
  DIE_SIZE,
  COURSE_POINT_DEGREES,
  COURSES
} from "../constants";
import {
  collectFireShips,
  canShipFire,
  shipSideOf,
  restoreFireSession,
  createFirePhase,
  determineInitiative,
  type FirePhase,
  type FireSessionState
} from "../round/fire-session";
import { fireShipAtTarget, type FireContext, type FireReport, type FiringShip } from "../combat/fire-ship";
import { fireFighterGroupAtTarget, type FighterFireReport } from "../combat/fire-fighters";
import { plotMovementPath, type MovementPath } from "../movement/path";
import { usableThrust } from "../ship/systems";
import { previewPointsPx } from "../movement/preview";
import { drawMovementPreview, clearMovementPreview } from "./preview-overlay";
import { parseFleet } from "../data/fleet-import";
import { fireNeedleAtSystem, type NeedleReport } from "../combat/needle";
import { resolveSalvoAtTarget, type SalvoReport } from "../combat/salvo";
import { resolveDamageControl, damageControlRepairs } from "../combat/damage-control";
import { syncShipStatuses } from "../status";
import type { SystemRef } from "../ship/systems";

// --- Pure report formatting (unit-tested) -----------------------------------

/** Minimal HTML entity escape -- ship/token names are user-editable (XSS). */
export function escapeHtml(value: string): string {
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

/** The shared middle+tail of a fire report: the damage line, threshold check, and
 * destruction notice. `target` is already HTML-escaped. */
function reportBodyLines(
  report: { distance?: number; totalDamage: number; thresholdsCrossed: number[]; systemsKnockedOut: number; destroyed: boolean },
  target: string
): string[] {
  const range = report.distance === undefined ? "" : `Range ${Math.round(report.distance)}mu &middot; `;
  const lines = [`<p>${range}<strong>${report.totalDamage}</strong> damage.</p>`];
  if (report.thresholdsCrossed.length > 0) {
    lines.push(
      `<p>Threshold check (row ${report.thresholdsCrossed.join(", ")}): ` +
        `<strong>${report.systemsKnockedOut}</strong> system(s) knocked out.</p>`
    );
  }
  if (report.destroyed) {
    lines.push(`<p class="ft-destroyed"><strong>${target} destroyed.</strong></p>`);
  }
  return lines;
}

/** Wraps a report's heading + body lines in the card container. */
function wrapReport(heading: string, bodyLines: string[]): string {
  return `<div class="ft-fire-report"><h3>${heading}</h3>${bodyLines.join("")}</div>`;
}

/** Builds the chat-card HTML summarising one ship's fire at a target. */
export function buildFireReportHtml(report: FireReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);
  return wrapReport(`${attacker} &rarr; ${target}`, reportBodyLines(report, target));
}

/** Builds the chat-card HTML summarising a fighter group's attack on a ship. */
export function buildFighterReportHtml(report: FighterFireReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);

  const pdsLine = report.pdsKills > 0 ? [`<p>Point defence shot down ${report.pdsKills} fighter(s).</p>`] : [];

  if (!report.fired) {
    return wrapReport(`${attacker} &rarr; ${target}`, [
      ...pdsLine,
      `<p>No attack (${escapeHtml(report.reason ?? "unable")}).</p>`
    ]);
  }
  return wrapReport(`${attacker} (fighters) &rarr; ${target}`, [
    ...pdsLine,
    ...reportBodyLines(report, target)
  ]);
}

/** Builds the chat-card HTML for a needle-beam strike. */
export function buildNeedleReportHtml(report: NeedleReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);
  const system = escapeHtml(report.systemType);

  if (!report.fired) {
    return wrapReport(`${attacker} needle &rarr; ${target}`, [
      `<p>No strike (${escapeHtml(report.reason ?? "unable")}).</p>`
    ]);
  }
  const body = report.hit
    ? `<p>Needle beam knocked out the target's <strong>${system}</strong>.</p>`
    : `<p>Needle beam missed the target's ${system}.</p>`;
  return wrapReport(`${attacker} needle &rarr; ${target}`, [body]);
}

/** Builds the chat-card HTML for a salvo missile attack. */
export function buildSalvoReportHtml(report: SalvoReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);
  if (!report.fired) {
    return wrapReport(`${attacker} salvo &rarr; ${target}`, [
      `<p>No launch (${escapeHtml(report.reason ?? "unable")}).</p>`
    ]);
  }
  const intro = `<p>${report.onTarget} on target, ${report.intercepted} intercepted, ` +
    `<strong>${report.survivors}</strong> hit.</p>`;
  return wrapReport(`${attacker} salvo &rarr; ${target}`, [intro, ...reportBodyLines(report, target)]);
}

// --- Injectable actions (testable core) -------------------------------------

export interface RoundControlApi {
  measure: FireContext["measure"];
  facing: FireContext["facing"];
  dice: FireContext["dice"];
}

/** Resolves one ship firing at another and returns the report + its HTML. */
export async function resolveFireBetween(
  attacker: FiringShip & { name?: string },
  target: FiringShip & { name?: string },
  api: RoundControlApi
): Promise<{ report: FireReport; html: string }> {
  const report = await fireShipAtTarget({
    attacker,
    target,
    context: { measure: api.measure, facing: api.facing, dice: api.dice }
  });
  const html = buildFireReportHtml(report, {
    attacker: attacker.name ?? "Attacker",
    target: target.name ?? "Target"
  });
  return { report, html };
}

/**
 * Resolves a ship's plotted movement into the pivot-move-pivot-move path (final
 * velocity/course + the displacement waypoints), reading the ship's current
 * state off its system.
 */
export function resolveMovementPath(
  system: { velocity?: number; course?: number; thrust?: number; driveHits?: number },
  orderText: string
): MovementPath {
  return plotMovementPath(
    { velocity: system.velocity ?? 0, course: system.course ?? COURSES },
    orderText,
    usableThrust(system)
  );
}

/** Pixels per mu for a scene grid ({size} px per {distance} units), floored at 1. */
export function pixelsPerMu(grid: { size?: number; distance?: number } | undefined): number {
  const size = grid?.size;
  const distance = grid?.distance;
  if (!size || !distance || size <= 0 || distance <= 0) {
    return 1;
  }
  return size / distance;
}

// --- Foundry glue -----------------------------------------------------------

interface FlagDocLike {
  getFlag: (scope: string, key: string) => unknown;
  setFlag: (scope: string, key: string, value: unknown) => Promise<unknown>;
  unsetFlag: (scope: string, key: string) => Promise<unknown>;
}

interface GlobalScope {
  game?: {
    user?: { isGM?: boolean; id?: string; targets?: { first?: () => unknown } };
    battleframe?: RoundControlApi;
    combats?: { active?: FlagDocLike };
  };
  battleframe?: RoundControlApi;
  canvas?: {
    tokens?: { controlled?: any[]; placeables?: any[] };
    scene?: (FlagDocLike & { grid?: { size?: number; distance?: number } }) | undefined;
  };
  ui?: { notifications?: { warn?: (t: string) => void; error?: (t: string) => void; info?: (t: string) => void } };
  Hooks?: { on?: (event: string, cb: (...args: unknown[]) => void) => void };
  ChatMessage?: { create: (data: Record<string, unknown>) => Promise<unknown> };
  Actor?: { createDocuments: (data: any[]) => Promise<unknown> };
  foundry?: { applications?: { api?: { DialogV2?: { prompt: (opts: unknown) => Promise<unknown> } } } };
}

function g(): GlobalScope {
  return globalThis as unknown as GlobalScope;
}

function api(): RoundControlApi | undefined {
  const scope = g();
  return scope.game?.battleframe ?? scope.battleframe;
}

function notify(kind: "warn" | "error" | "info", text: string): void {
  g().ui?.notifications?.[kind]?.(text);
}

function isGM(): boolean {
  return g().game?.user?.isGM === true;
}

/** The user's controlled token, or undefined with a warning. */
function controlledToken(): any | undefined {
  const controlled = g().canvas?.tokens?.controlled ?? [];
  if (controlled.length !== 1) {
    notify("warn", `${MODULE_ID} | select exactly one of your ships first`);
    return undefined;
  }
  return controlled[0];
}

/** The user's single targeted token, or undefined with a warning. */
function targetedToken(): any | undefined {
  const targets = g().game?.user?.targets;
  const first = targets && typeof targets.first === "function" ? targets.first() : undefined;
  if (!first) {
    notify("warn", `${MODULE_ID} | target one enemy ship (T over the token) first`);
    return undefined;
  }
  return first;
}

function toFiringShip(token: any): (FiringShip & { name?: string }) | undefined {
  const actor = token?.actor;
  if (!actor) {
    return undefined;
  }
  return {
    token,
    name: token?.name ?? actor?.name,
    system: actor.system,
    update: (data: Record<string, unknown>) => actor.update(data),
    toggleStatusEffect: (id: string, opts: { active: boolean }) => actor.toggleStatusEffect(id, opts)
  };
}

/** Fire-tool action: resolve the controlled ship's fire at the targeted ship. */
export async function fireAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM resolves fire`);
    return;
  }
  const services = api();
  if (!services) {
    notify("error", `${MODULE_ID} | the battleframe services were not found`);
    return;
  }
  const attackerToken = controlledToken();
  const targetToken = targetedToken();
  if (!attackerToken || !targetToken) {
    return;
  }
  const target = toFiringShip(targetToken);
  if (!target) {
    notify("warn", `${MODULE_ID} | the target needs a ship actor`);
    return;
  }

  // A fighter group attacks differently (size dice, 6mu fore arc) than a ship.
  const attackerType = attackerToken?.actor?.type as string | undefined;
  if (attackerType?.endsWith(FIGHTER_GROUP_ACTOR_TYPE)) {
    const report = await fireFighterGroupAtTarget({
      group: { token: attackerToken, system: attackerToken.actor.system },
      target,
      context: { measure: services.measure, facing: services.facing, dice: services.dice }
    });
    const html = buildFighterReportHtml(report, {
      attacker: attackerToken?.name ?? "Fighters",
      target: targetToken?.name ?? "Target"
    });
    await g().ChatMessage?.create({ content: html });
    return;
  }

  const attacker = toFiringShip(attackerToken);
  if (!attacker) {
    notify("warn", `${MODULE_ID} | the attacker needs a ship actor`);
    return;
  }

  // If a fire phase is running, enforce initiative + alternation: only the active
  // side's still-unfired ships may fire. With no fire phase, firing is free.
  const phase = activeFirePhase();
  if (phase && !canShipFire(phase, shipSideOf(attackerToken), attackerToken.id)) {
    notify("warn", `${MODULE_ID} | it is side ${phase.activeSide()}'s turn to fire (pick one of its ships)`);
    return;
  }

  const { html } = await resolveFireBetween(attacker, target, services);
  await g().ChatMessage?.create({ content: html });

  if (phase) {
    await advanceFirePhase(phase, attackerToken.id);
  }
}

/** Needle-tool action: snipe one nominated system on the targeted ship. */
export async function needleAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM resolves fire`);
    return;
  }
  const services = api();
  if (!services) {
    notify("error", `${MODULE_ID} | the battleframe services were not found`);
    return;
  }
  const attackerToken = controlledToken();
  const targetToken = targetedToken();
  if (!attackerToken || !targetToken) {
    return;
  }
  const target = toFiringShip(targetToken);
  if (!target || !attackerToken.actor) {
    notify("warn", `${MODULE_ID} | both tokens need a ship actor`);
    return;
  }

  // Nominate which system to snipe.
  const dialog = g().foundry?.applications?.api?.DialogV2;
  let systemType: SystemRef["type"] = "fcs";
  if (dialog?.prompt) {
    const options = ["fcs", "drive", "screen", "pds", "weapon"]
      .map((t) => `<option value="${t}">${t}</option>`)
      .join("");
    const value = (await dialog.prompt({
      window: { title: "Full Thrust: Needle Beam -- target system" },
      content: `<p>System to snipe:</p><select name="system">${options}</select>`,
      ok: {
        label: "Fire",
        callback: (_event: unknown, button: any) => button?.form?.elements?.system?.value ?? "fcs"
      }
    })) as string;
    systemType = (value as SystemRef["type"]) ?? "fcs";
  }

  const report = await fireNeedleAtSystem({
    attacker: { token: attackerToken, system: attackerToken.actor.system },
    target,
    systemType,
    context: { measure: services.measure, facing: services.facing, dice: services.dice }
  });
  const html = buildNeedleReportHtml(report, {
    attacker: attackerToken?.name ?? "Attacker",
    target: targetToken?.name ?? "Target"
  });
  await g().ChatMessage?.create({ content: html });
}

/** Salvo-tool action: launch a salvo at the targeted ship. */
export async function salvoAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM resolves fire`);
    return;
  }
  const services = api();
  if (!services) {
    notify("error", `${MODULE_ID} | the battleframe services were not found`);
    return;
  }
  const attackerToken = controlledToken();
  const targetToken = targetedToken();
  if (!attackerToken || !targetToken) {
    return;
  }
  const target = toFiringShip(targetToken);
  if (!target || !attackerToken.actor) {
    notify("warn", `${MODULE_ID} | both tokens need a ship actor`);
    return;
  }

  const report = await resolveSalvoAtTarget({
    attacker: {
      token: attackerToken,
      system: attackerToken.actor.system,
      update: (data: Record<string, unknown>) => attackerToken.actor.update(data)
    },
    target,
    context: { measure: services.measure, facing: services.facing, dice: services.dice }
  });
  const html = buildSalvoReportHtml(report, {
    attacker: attackerToken?.name ?? "Attacker",
    target: targetToken?.name ?? "Target"
  });
  await g().ChatMessage?.create({ content: html });
}

/** The scene grid pixels-per-mu for the token's scene. */
function tokenScale(token: any): number {
  return pixelsPerMu(token?.document?.parent?.grid ?? g().canvas?.scene?.grid);
}

/** The token's centre in pixels (falls back to its top-left document position). */
function tokenStartPx(token: any): { x: number; y: number } {
  return token?.center ?? { x: token?.document?.x ?? 0, y: token?.document?.y ?? 0 };
}

/**
 * Plot-tool action (Order Plotting phase): the owner enters a movement order and
 * sees a LOCAL preview line-and-arrow of the resulting pivot-move-pivot path form
 * as they type. The order is stored SECRETLY on the ship (an owner/GM-only flag);
 * the token does NOT move. All plotted ships move together later, on Execute
 * Maneuvers -- so the opponent sees nothing until the reveal.
 */
export async function plotAction(): Promise<void> {
  const token = controlledToken();
  if (!token?.actor) {
    return;
  }
  const system = token.actor.system ?? {};
  const scale = tokenScale(token);
  const startPx = tokenStartPx(token);

  const redraw = (orderText: string): void => {
    const path = resolveMovementPath(system, orderText);
    drawMovementPreview(previewPointsPx(startPx, path, scale), path.legal);
  };

  const dialog = g().foundry?.applications?.api?.DialogV2;
  let orderText = "";
  if (dialog?.prompt) {
    redraw(""); // show the "no change" start state
    const value = (await dialog.prompt({
      window: { title: "Full Thrust: Plot Movement (hidden until execute)" },
      content: `<p>Order (e.g. <code>+4,P2</code>):</p><input type="text" name="order" autofocus />`,
      render: (_event: unknown, dlg: any) => {
        const input = dlg?.element?.querySelector?.('input[name="order"]');
        input?.addEventListener?.("input", (e: any) => redraw(e?.target?.value ?? ""));
      },
      ok: {
        label: "Plot",
        callback: (_event: unknown, button: any) => button?.form?.elements?.order?.value ?? ""
      }
    })) as string;
    orderText = value ?? "";
  }

  clearMovementPreview();

  const path = resolveMovementPath(system, orderText);
  if (!path.legal) {
    notify("warn", `${MODULE_ID} | illegal order (${path.reason})`);
    return;
  }
  // Store secretly; the token stays put until maneuvers are executed.
  await token.actor.setFlag?.(MODULE_ID, PLOTTED_ORDER_FLAG, orderText);
  notify("info", `${MODULE_ID} | plotted "${orderText || "no change"}" (hidden until execute)`);
}

// --- Fire-phase turn order (initiative + strict alternation) ----------------

/** The Document the fire-phase state lives on: the active Combat, else the Scene. */
function firePhaseDoc(): FlagDocLike | undefined {
  return g().game?.combats?.active ?? g().canvas?.scene ?? undefined;
}

/** The stored fire-phase state, or undefined when no fire phase is running. */
function loadFireState(): FireSessionState | undefined {
  const state = firePhaseDoc()?.getFlag(MODULE_ID, FIRE_PHASE_FLAG);
  return state && typeof state === "object" ? (state as FireSessionState) : undefined;
}

/** The active fire phase restored from state + freshly-gathered ships, or undefined. */
function activeFirePhase(): FirePhase | undefined {
  const state = loadFireState();
  if (!state) {
    return undefined;
  }
  const ships = collectFireShips(g().canvas?.tokens?.placeables ?? []).map((s) => ({
    id: s.id,
    sideId: s.sideId
  }));
  return restoreFireSession(ships, state);
}

/**
 * Advances the fire phase after `shipId` has fired: records it, and either saves
 * the new state (announcing the next side) or clears the phase when every ship
 * has fired.
 */
async function advanceFirePhase(phase: FirePhase, shipId: string): Promise<void> {
  const doc = firePhaseDoc();
  try {
    phase.fire(shipId);
  } catch {
    return; // out-of-turn / already-fired: the enforcement check should prevent this
  }
  if (phase.isComplete()) {
    await doc?.unsetFlag(MODULE_ID, FIRE_PHASE_FLAG);
    notify("info", `${MODULE_ID} | fire phase complete`);
  } else {
    await doc?.setFlag(MODULE_ID, FIRE_PHASE_FLAG, phase.serialize());
    notify("info", `${MODULE_ID} | next to fire: side ${phase.activeSide()}`);
  }
}

const MAX_INITIATIVE_REROLLS = 5;

/**
 * Begin-Fire-Phase action (GM): roll initiative (one die per side, re-rolling
 * ties), then open the phase so ships fire in strict alternation from the winning
 * side. State is persisted to a Document so it survives reload and syncs.
 */
export async function beginFirePhaseAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM begins the fire phase`);
    return;
  }
  const services = api();
  const ships = collectFireShips(g().canvas?.tokens?.placeables ?? []);
  const sides = [...new Set(ships.map((s) => s.sideId))];
  if (sides.length < 2) {
    notify("warn", `${MODULE_ID} | need ships on two sides (set one fleet Friendly, one Hostile)`);
    return;
  }

  // Roll off for initiative, re-rolling a tie.
  let firstSideId: string | null = null;
  for (let attempt = 0; attempt <= MAX_INITIATIVE_REROLLS && firstSideId === null; attempt += 1) {
    const rolls = [];
    for (const sideId of sides) {
      const roll = await services?.dice?.rollPool?.(1, DIE_SIZE, {
        rulesetId: MODULE_ID,
        flavor: `initiative (side ${sideId})`
      });
      rolls.push({ sideId, roll: roll?.[0] ?? 0 });
    }
    firstSideId = determineInitiative(rolls);
  }
  if (firstSideId === null) {
    notify("warn", `${MODULE_ID} | initiative stayed tied -- try again`);
    return;
  }

  const phase = createFirePhase({ ships, firstSideId });
  await firePhaseDoc()?.setFlag(MODULE_ID, FIRE_PHASE_FLAG, phase.serialize());
  notify("info", `${MODULE_ID} | side ${firstSideId} won initiative and fires first`);
}

/**
 * Execute-tool action (GM): reveal and run every ship's secretly-plotted order at
 * once -- update its velocity/course and trace its path on the canvas, then clear
 * the plotted-order flag. This is the simultaneous reveal: no ship moved during
 * plotting, so both players see all maneuvers happen together here.
 */
export async function executeManeuversAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM executes maneuvers`);
    return;
  }
  const tokens = g().canvas?.tokens?.placeables ?? [];
  let moved = 0;

  for (const token of tokens) {
    const actor = token?.actor;
    if (typeof actor?.type !== "string" || !actor.type.endsWith(SHIP_ACTOR_TYPE)) {
      continue;
    }
    const orderText = actor.getFlag?.(MODULE_ID, PLOTTED_ORDER_FLAG);
    if (typeof orderText !== "string") {
      continue;
    }
    const path = resolveMovementPath(actor.system ?? {}, orderText);
    if (path.legal) {
      await actor.update({ "system.velocity": path.velocity, "system.course": path.course });
      await executeMovementPath(token, path);
      moved += 1;
    }
    await actor.unsetFlag?.(MODULE_ID, PLOTTED_ORDER_FLAG);
  }

  clearMovementPreview();
  notify("info", `${MODULE_ID} | executed ${moved} maneuver(s)`);
}

/**
 * New-turn action (GM): clears any leftover secretly-plotted orders and ends the
 * fire phase, so the next turn starts clean. (Movement/damage persist -- this
 * only resets the per-turn plotting + fire-order bookkeeping.)
 */
export async function newTurnAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM starts a new turn`);
    return;
  }
  const tokens = g().canvas?.tokens?.placeables ?? [];
  let cleared = 0;
  for (const token of tokens) {
    const actor = token?.actor;
    if (typeof actor?.type !== "string" || !actor.type.endsWith(SHIP_ACTOR_TYPE)) {
      continue;
    }
    if (actor.getFlag?.(MODULE_ID, PLOTTED_ORDER_FLAG) !== undefined) {
      await actor.unsetFlag?.(MODULE_ID, PLOTTED_ORDER_FLAG);
      cleared += 1;
    }
  }
  await firePhaseDoc()?.unsetFlag(MODULE_ID, FIRE_PHASE_FLAG);
  clearMovementPreview();
  notify("info", `${MODULE_ID} | new turn -- cleared ${cleared} plot(s) and ended the fire phase`);
}

/**
 * Damage-control action (GM, end of turn): each ship's Damage Control Parties
 * roll (a 6 repairs a system); repairs restore knocked-out systems in priority
 * order. Reads `damageControl` (party count) off each ship.
 */
export async function damageControlAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM runs damage control`);
    return;
  }
  const services = api();
  const tokens = g().canvas?.tokens?.placeables ?? [];
  let repairedShips = 0;

  for (const token of tokens) {
    const actor = token?.actor;
    if (typeof actor?.type !== "string" || !actor.type.endsWith(SHIP_ACTOR_TYPE)) {
      continue;
    }
    const parties = (actor.system?.damageControl as number | undefined) ?? 0;
    if (parties < 1) {
      continue;
    }
    const faces = (await services?.dice?.rollPool?.(parties, DIE_SIZE, {
      rulesetId: MODULE_ID,
      flavor: `damage control (${token?.name ?? "ship"})`
    })) ?? [];
    const repairs = damageControlRepairs(faces);
    if (repairs > 0) {
      await actor.update(resolveDamageControl(actor.system ?? {}, repairs));
      await syncShipStatuses(actor);
      repairedShips += 1;
    }
  }

  notify("info", `${MODULE_ID} | damage control repaired systems on ${repairedShips} ship(s)`);
}

/**
 * Import-tool action: the player pastes their own fleet JSON and it becomes ship
 * Actors they own. Bring-your-own-data -- we ship no fleet lists. Actor creation
 * is gated by Foundry's "Create New Actors" world permission; if the player
 * lacks it, we say so rather than failing silently (the GM enables it or imports
 * for them).
 */
export async function importFleetAction(): Promise<void> {
  const dialog = g().foundry?.applications?.api?.DialogV2;
  let json = "";
  if (dialog?.prompt) {
    json = ((await dialog.prompt({
      window: { title: "Full Thrust: Import Fleet" },
      content:
        `<p>Paste your fleet JSON (an object with a <code>ships</code> array):</p>` +
        `<textarea name="fleet" rows="14" style="width:100%"></textarea>`,
      ok: {
        label: "Import",
        callback: (_event: unknown, button: any) => button?.form?.elements?.fleet?.value ?? ""
      }
    })) as string) ?? "";
  }
  if (!json.trim()) {
    return;
  }

  const { ships, errors } = parseFleet(json);
  for (const error of errors) {
    notify("warn", `${MODULE_ID} | ${error}`);
  }
  if (ships.length === 0) {
    notify("warn", `${MODULE_ID} | no ships imported`);
    return;
  }

  // Owned by the importing player, so only they (and the GM) can read it.
  const userId = g().game?.user?.id;
  const toCreate = ships.map((ship) =>
    userId ? { ...ship, ownership: { [userId]: 3 } } : ship
  );

  const actorClass = g().Actor;
  if (!actorClass?.createDocuments) {
    notify("error", `${MODULE_ID} | cannot create actors in this context`);
    return;
  }
  try {
    await actorClass.createDocuments(toCreate);
    notify("info", `${MODULE_ID} | imported ${ships.length} ship(s)`);
  } catch {
    notify(
      "error",
      `${MODULE_ID} | could not create the ships -- ask your GM to enable "Create New Actors" ` +
        `for players, or to import the fleet for you`
    );
  }
}

/** Course heading as a token rotation angle (degrees, clockwise from up). */
function courseRotation(course: number): number {
  return (course % COURSES) * COURSE_POINT_DEGREES;
}

/**
 * Traces the ship's cinematic pivot-move-pivot-move path on the canvas: pivot to
 * the mid-turn heading and move to the waypoint, then pivot to the final heading
 * and move to the end. Two sequential token updates so Foundry animates the
 * curved path (facing == heading throughout). Displacements are mu, converted to
 * pixels via the scene grid.
 */
async function executeMovementPath(token: any, path: MovementPath): Promise<void> {
  const doc = token?.document;
  if (!doc?.update) {
    return;
  }
  const grid = doc.parent?.grid ?? g().canvas?.scene?.grid;
  const scale = pixelsPerMu(grid);
  const startX = doc.x ?? 0;
  const startY = doc.y ?? 0;

  // Leg 1: pivot to the mid-turn heading, move to the waypoint.
  await doc.update({
    x: startX + path.waypoint.dx * scale,
    y: startY + path.waypoint.dy * scale,
    rotation: courseRotation(path.midCourse)
  });
  // Leg 2: pivot to the final heading, move to the end.
  await doc.update({
    x: startX + path.end.dx * scale,
    y: startY + path.end.dy * scale,
    rotation: courseRotation(path.course)
  });
}

/** Adds the Full Thrust scene control, tolerating both payload shapes. */
export function addSceneControl(controls: unknown): void {
  const gm = isGM();
  // Begin the fire phase: roll initiative, then ships fire in strict alternation.
  const initiativeTool = {
    name: "full-thrust-initiative",
    title: "battleframe-full-thrust.controls.initiative",
    icon: "fas fa-dice",
    button: true,
    visible: gm,
    order: 0,
    onClick: () => void beginFirePhaseAction(),
    onChange: () => void beginFirePhaseAction()
  };
  const fireTool = {
    name: "full-thrust-fire",
    title: "battleframe-full-thrust.controls.fire",
    icon: "fas fa-crosshairs",
    button: true,
    visible: gm,
    order: 1,
    onClick: () => void fireAction(),
    onChange: () => void fireAction()
  };
  const needleTool = {
    name: "full-thrust-needle",
    title: "battleframe-full-thrust.controls.needle",
    icon: "fas fa-syringe",
    button: true,
    visible: gm,
    order: 2,
    onClick: () => void needleAction(),
    onChange: () => void needleAction()
  };
  const salvoTool = {
    name: "full-thrust-salvo",
    title: "battleframe-full-thrust.controls.salvo",
    icon: "fas fa-meteor",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void salvoAction(),
    onChange: () => void salvoAction()
  };
  const plotTool = {
    name: "full-thrust-plot",
    title: "battleframe-full-thrust.controls.plot",
    icon: "fas fa-route",
    button: true,
    visible: true,
    order: 2,
    onClick: () => void plotAction(),
    onChange: () => void plotAction()
  };
  // End-of-turn damage control repair -- GM only.
  const damageControlTool = {
    name: "full-thrust-damage-control",
    title: "battleframe-full-thrust.controls.damageControl",
    icon: "fas fa-wrench",
    button: true,
    visible: gm,
    order: 5,
    onClick: () => void damageControlAction(),
    onChange: () => void damageControlAction()
  };
  // Execute reveals every ship's secretly-plotted move at once -- GM only.
  const executeTool = {
    name: "full-thrust-execute",
    title: "battleframe-full-thrust.controls.execute",
    icon: "fas fa-play",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void executeManeuversAction(),
    onChange: () => void executeManeuversAction()
  };
  // Start a fresh turn: clear leftover plots + end the fire phase -- GM only.
  const newTurnTool = {
    name: "full-thrust-new-turn",
    title: "battleframe-full-thrust.controls.newTurn",
    icon: "fas fa-forward",
    button: true,
    visible: gm,
    order: 7,
    onClick: () => void newTurnAction(),
    onChange: () => void newTurnAction()
  };
  // Import a fleet from JSON -- any player (subject to Foundry's create-actor perm).
  const importTool = {
    name: "full-thrust-import",
    title: "battleframe-full-thrust.controls.import",
    icon: "fas fa-file-import",
    button: true,
    visible: true,
    order: 4,
    onClick: () => void importFleetAction(),
    onChange: () => void importFleetAction()
  };

  const control = {
    name: MODULE_ID,
    title: "battleframe-full-thrust.controls.title",
    icon: "fas fa-rocket",
    layer: "tokens",
    visible: true,
    order: 0,
    activeTool: plotTool.name,
    tools: {} as Record<string, unknown> | unknown[]
  };

  const tools = [initiativeTool, fireTool, needleTool, salvoTool, plotTool, executeTool, damageControlTool, newTurnTool, importTool];
  if (Array.isArray(controls)) {
    control.tools = tools;
    controls.push(control);
    return;
  }
  if (controls && typeof controls === "object") {
    control.tools = Object.fromEntries(tools.map((t) => [t.name, t]));
    (controls as Record<string, unknown>)[MODULE_ID] = control;
  }
}

/** Registers the scene control against Foundry's own hook. */
export function registerRoundControl(): void {
  const hooks = g().Hooks;
  if (!hooks?.on) {
    return;
  }
  hooks.on("getSceneControlButtons", (...args: unknown[]) => addSceneControl(args[0]));
}

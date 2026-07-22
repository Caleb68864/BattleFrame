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
  ACTIVE_MISSILES_FLAG,
  WAVE_GUN_CHARGE_FLAG,
  WAVE_GUN_FULL_CHARGE,
  LAUNCHED_GROUPS_FLAG,
  FIGHTER_GROUP_MAX,
  FIGHTER_ATTACK_RANGE_MU,
  DIE_SIZE,
  COURSE_POINT_DEGREES,
  COURSES
} from "../constants";
import {
  collectFireShips,
  canShipFire,
  shipSideOf,
  createFireOrder,
  restoreFireOrder,
  determineInitiative,
  firePhaseStatusLine,
  type ActivationOrderLike,
  type RoundsApiLike,
  type FireSessionState
} from "../round/fire-session";
import { fireShipAtTarget, type FireContext, type FireReport, type FiringShip } from "../combat/fire-ship";
import { fireShipSplit, type FireShipSplitReport } from "../combat/fire-ship-split";
import { advanceMissile, missileExpired, type ActiveMissile } from "../combat/missile-phase";
import { resolveMissileAttack, missileCanAttack, type MissileAttackReport, type MissileWarhead } from "../combat/missile";
import { drawMissiles, clearMissiles } from "./missile-overlay";
import { waveGunDiceAtRange, waveGunDamage, novaCannonDiceForTurn, novaCannonDamage, waveGunChargeAfterTurn, waveGunIsCharged, waveGunChargeAfterFiring } from "../combat/spinal";
import { canReachToAttack } from "../movement/fighter-move";
import { bayCapacity } from "../combat/carrier";
import { applyDamageAndThreshold } from "../combat/apply-damage";
import { fireFighterGroupAtTarget, type FighterFireReport } from "../combat/fire-fighters";
import { plotMovementPath, type MovementPath } from "../movement/path";
import { usableThrust } from "../ship/systems";
import { previewPointsPx } from "../movement/preview";
import { drawMovementPreview, clearMovementPreview } from "./preview-overlay";
import { parseFleet } from "../data/fleet-import";
import { fireNeedleAtSystem, type NeedleReport } from "../combat/needle";
import { resolveSalvoAtTarget, type SalvoReport } from "../combat/salvo";
import { resolveDogfight, type DogfightReport } from "../combat/dogfight";
import { previewTargeting, type TargetingRow } from "../combat/targeting";
import { toggleArcPin, isArcPinned } from "./arc-overlay";
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

/** Builds the chat-card HTML for a dogfight (fighter vs fighter). */
export function buildDogfightReportHtml(report: DogfightReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);
  if (!report.fired) {
    return wrapReport(`${attacker} &times; ${target}`, [
      `<p>No dogfight (${escapeHtml(report.reason ?? "unable")}).</p>`
    ]);
  }
  const lines = [
    `<p>${attacker} shot down <strong>${report.attackerKills}</strong> fighter(s).</p>`,
    report.defenderReturned
      ? `<p>${target} returned fire: <strong>${report.defenderKills}</strong> killed.</p>`
      : `<p>${target} could not return fire.</p>`
  ];
  return wrapReport(`${attacker} &times; ${target} (dogfight)`, lines);
}

/**
 * Builds the pre-fire targeting card: one line per weapon showing whether it
 * bears and what it would do at this range, so a player sees their reach BEFORE
 * committing to fire (roadmap P1 #11). Rows come from the pure `previewTargeting`.
 */
export function buildTargetingReportHtml(
  rows: readonly TargetingRow[],
  names: FireReportNames,
  distanceMu: number
): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);
  const heading = `${attacker} &rarr; ${target} (targeting)`;
  const range = `<p>Range <strong>${Math.round(distanceMu)}mu</strong>.</p>`;

  const bearing = rows.filter((r) => r.status === "will-fire");
  if (bearing.length === 0) {
    return wrapReport(heading, [range, `<p><em>No weapon bears on the target.</em></p>`]);
  }

  const items = rows
    .map((r) => {
      const label = `${escapeHtml(r.kind)}${r.kind === "beam" && r.dice ? "" : ""}`;
      const cls = r.status === "will-fire" ? "ft-bears" : "ft-no-bear";
      return `<li class="${cls}">${label}: ${escapeHtml(r.effect)}</li>`;
    })
    .join("");
  return wrapReport(heading, [range, `<ul class="ft-targeting">${items}</ul>`]);
}

/**
 * Builds the multi-FCS split-fire card (roadmap P2 #18): one block per engaged
 * target (its range + damage + threshold/destruction), the FCS count, and a note
 * of any weapons that could not be assigned (every slot committed elsewhere).
 * Rows come from the pure `fireShipSplit` orchestrator.
 */
export function buildSplitFireReportHtml(report: FireShipSplitReport, attackerName: string): string {
  const attacker = escapeHtml(attackerName);
  if (report.refused === "no-fcs") {
    return wrapReport(`${attacker} split fire`, [`<p>No fire control (cannot fire).</p>`]);
  }
  const blocks: string[] = [];
  if (report.perTarget.length === 0) {
    blocks.push(`<p><em>No target in arc/range to engage.</em></p>`);
  }
  for (const t of report.perTarget) {
    const name = escapeHtml(t.targetName ?? "Target");
    blocks.push(`<p>&rarr; <strong>${name}</strong></p>`);
    blocks.push(...reportBodyLines(t, name));
  }
  if (report.unassigned.length > 0) {
    blocks.push(`<p class="ft-unassigned">${report.unassigned.length} weapon(s) unassigned (no free FCS / out of arc).</p>`);
  }
  return wrapReport(`${attacker} splits fire (${report.fcsCount} FCS)`, blocks);
}

/** Builds the chat card for an independent missile's strike on a ship (#15). */
export function buildMissileReportHtml(report: MissileAttackReport, targetName: string): string {
  const target = escapeHtml(targetName);
  const head = `Missile &rarr; ${target}`;
  if (!report.attacked) {
    return wrapReport(head, [`<p>No strike (${escapeHtml(report.reason ?? "no target")}).</p>`]);
  }
  if (report.intercepted) {
    return wrapReport(head, [`<p>Point defence destroyed the missile before it struck.</p>`]);
  }
  const lines = [`<p>${escapeHtml(report.warhead)} warhead: <strong>${report.totalDamage}</strong> damage.</p>`];
  if (report.nominatedSystemKnockedOut) {
    lines.push(`<p>The nominated system was knocked out.</p>`);
  }
  if (report.thresholdsCrossed.length > 0) {
    lines.push(`<p>Threshold check (row ${report.thresholdsCrossed.join(", ")}): <strong>${report.systemsKnockedOut}</strong> system(s) knocked out.</p>`);
  }
  if (report.destroyed) {
    lines.push(`<p class="ft-destroyed"><strong>${target} destroyed.</strong></p>`);
  }
  return wrapReport(head, lines);
}

/** A resolved spinal-weapon shot for the chat card. */
export interface SpinalFireOutcome {
  weapon: "Nova Cannon" | "Wave Gun";
  outOfRange?: boolean;
  distance: number;
  totalDamage: number;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
  destroyed: boolean;
}

/** Builds the chat card for a spinal-mount weapon (Nova Cannon / Wave Gun) shot. */
export function buildSpinalReportHtml(outcome: SpinalFireOutcome, targetName: string): string {
  const target = escapeHtml(targetName);
  const head = `${outcome.weapon} &rarr; ${target}`;
  if (outcome.outOfRange) {
    return wrapReport(head, [`<p>Out of range.</p>`]);
  }
  return wrapReport(head, reportBodyLines(outcome, target));
}

// --- Injectable actions (testable core) -------------------------------------

export interface RoundControlApi {
  measure: FireContext["measure"];
  facing: FireContext["facing"];
  dice: FireContext["dice"];
  /** The engine's activation-order service (game.battleframe.rounds). */
  rounds?: RoundsApiLike;
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
  Actor?: { createDocuments: (data: any[]) => Promise<unknown>; create: (data: any) => Promise<any> };
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

/** All of the user's targeted tokens (the Set), for multi-target split fire. */
function targetedTokens(): any[] {
  const targets = g().game?.user?.targets;
  if (!targets) {
    return [];
  }
  // Foundry's TargetSet is a Set; fall back to array-likes for test doubles.
  if (typeof (targets as any)[Symbol.iterator] === "function") {
    return Array.from(targets as Iterable<any>);
  }
  return Array.isArray(targets) ? targets : [];
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
  const context = { measure: services.measure, facing: services.facing, dice: services.dice };
  const attackerType = attackerToken?.actor?.type as string | undefined;
  const targetType = targetToken?.actor?.type as string | undefined;
  const attackerIsFighter = !!attackerType?.endsWith(FIGHTER_GROUP_ACTOR_TYPE);
  const targetIsFighter = !!targetType?.endsWith(FIGHTER_GROUP_ACTOR_TYPE);

  // Fighter vs fighter is a dogfight.
  if (attackerIsFighter && targetIsFighter) {
    const report = await resolveDogfight({
      attacker: { token: attackerToken, system: attackerToken.actor.system, update: (d: any) => attackerToken.actor.update(d) },
      defender: { token: targetToken, system: targetToken.actor.system, update: (d: any) => targetToken.actor.update(d) },
      context
    });
    await g().ChatMessage?.create({
      content: buildDogfightReportHtml(report, {
        attacker: attackerToken?.name ?? "Fighters",
        target: targetToken?.name ?? "Fighters"
      })
    });
    return;
  }

  const target = toFiringShip(targetToken);
  if (!target) {
    notify("warn", `${MODULE_ID} | the target needs a ship actor`);
    return;
  }

  // A fighter group attacks a ship differently (size dice, 6mu fore arc).
  if (attackerIsFighter) {
    const report = await fireFighterGroupAtTarget({
      group: { token: attackerToken, system: attackerToken.actor.system, update: (d: any) => attackerToken.actor.update(d) },
      target,
      context
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
  const order = activeFireOrder();
  if (order && !canShipFire(order, shipSideOf(attackerToken), attackerToken.id)) {
    notify("warn", `${MODULE_ID} | it is side ${order.activeSideId()}'s turn to fire (pick one of its ships)`);
    return;
  }

  const { html } = await resolveFireBetween(attacker, target, services);
  await g().ChatMessage?.create({ content: html });

  if (order) {
    await advanceFireOrder(order, attackerToken.id);
  }
}

/**
 * Split-fire tool: a multi-FCS ship divides its weapons across every ship the
 * GM has targeted (up to N = working FCS), firing each group in one action
 * (roadmap P2 #18). Falls back to the same initiative/alternation gate as Fire.
 */
export async function splitFireAction(): Promise<void> {
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
  if (!attackerToken) {
    return;
  }
  const targetTokens = targetedTokens();
  if (targetTokens.length === 0) {
    notify("warn", `${MODULE_ID} | target one or more enemy ships (T over each) first`);
    return;
  }
  const attacker = toFiringShip(attackerToken);
  if (!attacker) {
    notify("warn", `${MODULE_ID} | the attacker needs a ship actor`);
    return;
  }
  const targets = targetTokens.map(toFiringShip).filter(Boolean) as (FiringShip & { name?: string })[];
  if (targets.length === 0) {
    notify("warn", `${MODULE_ID} | the targets need ship actors`);
    return;
  }

  const order = activeFireOrder();
  if (order && !canShipFire(order, shipSideOf(attackerToken), attackerToken.id)) {
    notify("warn", `${MODULE_ID} | it is side ${order.activeSideId()}'s turn to fire (pick one of its ships)`);
    return;
  }

  const report = await fireShipSplit({
    attacker,
    targets,
    context: { measure: services.measure, facing: services.facing, dice: services.dice }
  });
  await g().ChatMessage?.create({
    content: buildSplitFireReportHtml(report, attackerToken?.name ?? "Attacker")
  });

  if (order) {
    await advanceFireOrder(order, attackerToken.id);
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

/**
 * Targeting-tool action: preview which of the controlled ship's weapons bear on
 * the targeted ship, and their effect at this range, WITHOUT firing (roadmap P1
 * #11). Available to players (it only reads their own ship's reach); the card is
 * whispered to the acting user so it does not clutter the shared log.
 */
export async function checkTargetingAction(): Promise<void> {
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
  const attacker = toFiringShip(attackerToken);
  if (!attacker || !attacker.system) {
    notify("warn", `${MODULE_ID} | select one of your ships to check its targeting`);
    return;
  }

  const distance = services.measure.between(attackerToken, targetToken, "centre-to-centre").distance;
  const bearing = services.facing.bearingOf(attackerToken, targetToken);
  const weapons = (attacker.system.weapons ?? []) as any[];
  const rows = previewTargeting({ weapons, distanceMu: distance, bearing });

  const html = buildTargetingReportHtml(
    rows,
    { attacker: attackerToken?.name ?? "Attacker", target: targetToken?.name ?? "Target" },
    distance
  );
  const userId = g().game?.user?.id;
  await g().ChatMessage?.create({
    content: html,
    whisper: userId ? [userId] : undefined
  });
}

// --- Independent (More Thrust) missiles: launch + phase ---------------------

/** The active scene document (holds the missile list flag). */
function missileScene(): FlagDocLike | undefined {
  return g().canvas?.scene as FlagDocLike | undefined;
}

/** Reads the scene's active-missile list (empty if none). */
function loadMissiles(): ActiveMissile[] {
  const scene = missileScene();
  const raw = scene?.getFlag?.(MODULE_ID, ACTIVE_MISSILES_FLAG);
  return Array.isArray(raw) ? (raw as ActiveMissile[]) : [];
}

/** Persists the missile list to the scene and redraws the markers. */
async function saveMissiles(missiles: ActiveMissile[]): Promise<void> {
  const scene = missileScene();
  if (missiles.length > 0) {
    await scene?.setFlag?.(MODULE_ID, ACTIVE_MISSILES_FLAG, missiles);
  } else {
    await scene?.unsetFlag?.(MODULE_ID, ACTIVE_MISSILES_FLAG);
  }
  drawMissiles(missiles);
  if (missiles.length === 0) {
    clearMissiles();
  }
}

/** A missile's forward unit vector (screen space, y down) for a given course. */
function courseForward(course: number): { fx: number; fy: number } {
  const rad = (courseRotation(course) * Math.PI) / 180;
  return { fx: Math.sin(rad), fy: -Math.cos(rad) };
}

/**
 * Launch-Missile tool: the controlled ship fires an independent missile forward
 * along its own course. The missile is placed just ahead of the ship and joins
 * the active-missile list; it flies on its own in the missile phase.
 */
export async function launchMissileAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM launches missiles`);
    return;
  }
  const token = controlledToken();
  if (!token?.actor) {
    return;
  }
  const scale = tokenScale(token);
  const start = tokenStartPx(token);
  const course = Number(token.actor.system?.course ?? 12);
  const disposition = Number(token.document?.disposition ?? 0);
  const { fx, fy } = courseForward(course);
  // Place the missile ~2mu ahead of the ship's centre so it clears the hull.
  const offset = (token?.w ?? 0) / 2 + 2 * scale;

  // Pick the warhead (and, for Needle, the system to snipe).
  const { warhead, systemType } = await pickWarhead();

  const missiles = loadMissiles();
  const id = `m${missiles.length}-${course}-${disposition}`;
  missiles.push({
    id,
    x: start.x + fx * offset,
    y: start.y + fy * offset,
    course,
    turnsLived: 0,
    warhead,
    systemType,
    ownerDisposition: disposition
  });
  await saveMissiles(missiles);
  notify("info", `${MODULE_ID} | ${warhead} missile launched (course ${course})`);
}

/** Prompts for a missile warhead (and, for Needle, the target system). */
async function pickWarhead(): Promise<{ warhead: MissileWarhead; systemType?: string }> {
  const dialog = g().foundry?.applications?.api?.DialogV2;
  if (!dialog?.prompt) {
    return { warhead: "normal" };
  }
  const warheadOpts = ["normal", "emp", "needle"].map((w) => `<option value="${w}">${w}</option>`).join("");
  const systemOpts = ["fcs", "drive", "screen", "pds", "weapon"].map((t) => `<option value="${t}">${t}</option>`).join("");
  const result = (await dialog.prompt({
    window: { title: "Full Thrust: Launch Missile -- warhead" },
    content:
      `<p>Warhead:</p><select name="warhead">${warheadOpts}</select>` +
      `<p>Needle target system (Needle warhead only):</p><select name="system">${systemOpts}</select>`,
    ok: {
      label: "Launch",
      callback: (_event: unknown, button: any) => ({
        warhead: button?.form?.elements?.warhead?.value ?? "normal",
        system: button?.form?.elements?.system?.value ?? "fcs"
      })
    }
  })) as { warhead: string; system: string } | null;
  const warhead = (result?.warhead as MissileWarhead) ?? "normal";
  return warhead === "needle" ? { warhead, systemType: result?.system ?? "fcs" } : { warhead };
}

/** A synthetic token-like object so the engine measure/facing can read a missile. */
function missileToken(missile: ActiveMissile, scene: unknown): unknown {
  return { center: { x: missile.x, y: missile.y }, scene, document: { rotation: courseRotation(missile.course) } };
}

/**
 * Missile-phase tool (GM): advance every active missile one move, resolve a
 * strike on the nearest eligible enemy ship (≤6mu, not in the missile's rear
 * arc), and remove missiles that struck or burned out (3-turn life).
 */
export async function advanceMissilesAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM runs the missile phase`);
    return;
  }
  const services = api();
  if (!services) {
    notify("error", `${MODULE_ID} | the battleframe services were not found`);
    return;
  }
  let missiles = loadMissiles();
  if (missiles.length === 0) {
    notify("info", `${MODULE_ID} | no missiles in flight`);
    return;
  }
  const context = { measure: services.measure, facing: services.facing, dice: services.dice };
  const scene = missileScene();
  const scale = tokenScale(controlledToken() ?? { document: { parent: { grid: g().canvas?.scene?.grid } } });
  const shipTokens = (g().canvas?.tokens?.placeables ?? []).filter(
    (t: any) => typeof t?.actor?.type === "string" && t.actor.type.endsWith(SHIP_ACTOR_TYPE)
  );

  const survivors: ActiveMissile[] = [];
  for (const before of missiles) {
    const moved = advanceMissile(before, 0, scale);
    const mToken = missileToken(moved, scene);

    // Nearest eligible enemy ship (other disposition, in range, not in rear arc).
    let best: { token: any; distance: number } | undefined;
    for (const st of shipTokens) {
      if (Number(st?.document?.disposition ?? 0) === moved.ownerDisposition) {
        continue;
      }
      const distance = context.measure.between(mToken, st, "centre-to-centre").distance;
      const bearing = context.facing.bearingOf(mToken, st);
      if (missileCanAttack(distance, bearing) && (!best || distance < best.distance)) {
        best = { token: st, distance };
      }
    }

    let struck = false;
    if (best) {
      const target = toFiringShip(best.token);
      if (target) {
        const report = await resolveMissileAttack({ missile: { token: mToken }, target, warhead: moved.warhead, systemType: moved.systemType as any, context });
        struck = report.attacked;
        await g().ChatMessage?.create({
          content: buildMissileReportHtml(report, best.token?.name ?? "Target")
        });
      }
    }

    if (!struck && !missileExpired(moved)) {
      survivors.push(moved);
    } else if (!struck && missileExpired(moved)) {
      notify("info", `${MODULE_ID} | a missile burned out`);
    }
  }

  await saveMissiles(survivors);
}

/**
 * Resolves a spinal-mount weapon's blast against the targeted ship: roll the
 * given dice, sum the faces for damage (screens give no protection), apply it +
 * a threshold check, and post the card. Shared by the Nova Cannon + Wave Gun
 * tools. SIMPLIFICATION: resolves directly against one chosen target (like the
 * salvo tool); the swept/expanding MeasuredTemplate that would auto-select every
 * ship under it, and the Wave Gun charge cycle, are deferred.
 */
async function resolveSpinalWeapon(
  weapon: "Nova Cannon" | "Wave Gun",
  diceCount: number,
  distance: number,
  target: FiringShip & { name?: string },
  targetName: string,
  damageOf: (faces: readonly number[]) => number,
  services: RoundControlApi
): Promise<void> {
  if (diceCount <= 0) {
    await g().ChatMessage?.create({
      content: buildSpinalReportHtml(
        { weapon, outOfRange: true, distance, totalDamage: 0, thresholdsCrossed: [], systemsKnockedOut: 0, destroyed: false },
        targetName
      )
    });
    return;
  }
  const faces = await services.dice.rollPool(diceCount, DIE_SIZE, { rulesetId: MODULE_ID, flavor: weapon });
  const damage = damageOf(faces);
  const outcome = await applyDamageAndThreshold(target, damage, services.dice);
  await g().ChatMessage?.create({
    content: buildSpinalReportHtml({ weapon, distance, totalDamage: damage, ...outcome }, targetName)
  });
}

/** Shared setup for a spinal tool: GM check + controlled/targeted ship + range. */
function spinalContext(): { services: RoundControlApi; target: FiringShip & { name?: string }; targetName: string; distance: number } | undefined {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM fires spinal weapons`);
    return undefined;
  }
  const services = api();
  if (!services) {
    notify("error", `${MODULE_ID} | the battleframe services were not found`);
    return undefined;
  }
  const attackerToken = controlledToken();
  const targetToken = targetedToken();
  if (!attackerToken || !targetToken) {
    return undefined;
  }
  const target = toFiringShip(targetToken);
  if (!target) {
    notify("warn", `${MODULE_ID} | the target needs a ship actor`);
    return undefined;
  }
  const distance = services.measure.between(attackerToken, targetToken, "centre-to-centre").distance;
  return { services, target, targetName: targetToken?.name ?? "Target", distance };
}

/** Nova-Cannon tool: fire the turn-1 blast (6D6, screens ignored) at the target. */
export async function fireNovaCannonAction(): Promise<void> {
  const ctx = spinalContext();
  if (!ctx) {
    return;
  }
  await resolveSpinalWeapon("Nova Cannon", novaCannonDiceForTurn(1), ctx.distance, ctx.target, ctx.targetName, novaCannonDamage, ctx.services);
}

/**
 * Charge-Wave-Gun tool (GM): spend a turn charging the controlled ship's Wave Gun
 * — roll 1d6 and accumulate; it is ready to fire at a stored total of 6+.
 */
export async function chargeWaveGunAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM charges the Wave Gun`);
    return;
  }
  const services = api();
  const ship = controlledToken();
  if (!services || !ship?.actor) {
    return;
  }
  const current = Number(ship.actor.getFlag?.(MODULE_ID, WAVE_GUN_CHARGE_FLAG) ?? 0);
  const [face] = await services.dice.rollPool(1, DIE_SIZE, { rulesetId: MODULE_ID, flavor: "Wave Gun charge" });
  const next = waveGunChargeAfterTurn(current, face ?? 0);
  await ship.actor.setFlag?.(MODULE_ID, WAVE_GUN_CHARGE_FLAG, next);
  notify("info", `${MODULE_ID} | Wave Gun charge ${next}/${WAVE_GUN_FULL_CHARGE}${waveGunIsCharged(next) ? " -- ready to fire" : ""}`);
}

/** Wave-Gun tool: fire at the target if charged (6+); firing discharges it. */
export async function fireWaveGunAction(): Promise<void> {
  const ctx = spinalContext();
  if (!ctx) {
    return;
  }
  const ship = controlledToken();
  const charge = Number(ship?.actor?.getFlag?.(MODULE_ID, WAVE_GUN_CHARGE_FLAG) ?? 0);
  if (!waveGunIsCharged(charge)) {
    notify("warn", `${MODULE_ID} | Wave Gun not charged (${charge}/${WAVE_GUN_FULL_CHARGE}) -- use Charge Wave Gun first`);
    return;
  }
  await resolveSpinalWeapon("Wave Gun", waveGunDiceAtRange(ctx.distance), ctx.distance, ctx.target, ctx.targetName, waveGunDamage, ctx.services);
  await ship?.actor?.setFlag?.(MODULE_ID, WAVE_GUN_CHARGE_FLAG, waveGunChargeAfterFiring());
}

/**
 * Move-Fighters tool: advance the controlled fighter group toward the targeted
 * ship, up to its move allowance (12mu / 18mu Fast), stopping at the edge of its
 * 6mu strike range (never overshooting onto the hull). Reuses the pure
 * `canReachToAttack`; the token then fires with the normal Fire tool. Available to
 * the group's owner (they move their own fighters).
 */
export async function fighterMoveAction(): Promise<void> {
  const groupToken = controlledToken();
  const targetToken = targetedToken();
  if (!groupToken || !targetToken) {
    return;
  }
  const type = groupToken.actor?.type as string | undefined;
  if (!type?.endsWith(FIGHTER_GROUP_ACTOR_TYPE)) {
    notify("warn", `${MODULE_ID} | select one of your fighter groups to move`);
    return;
  }
  const ppm = tokenScale(groupToken);
  const from = tokenStartPx(groupToken);
  const to = tokenStartPx(targetToken);
  // The reach math is in mu; convert the token centres px → mu and back.
  const reach = canReachToAttack(
    { x: from.x / ppm, y: from.y / ppm },
    { x: to.x / ppm, y: to.y / ppm },
    groupToken.actor?.system?.fighterType
  );
  const doc = groupToken.document;
  const halfW = (groupToken.w ?? 0) / 2;
  const halfH = (groupToken.h ?? 0) / 2;
  await doc?.update?.({ x: reach.intercept.x * ppm - halfW, y: reach.intercept.y * ppm - halfH });
  notify(
    "info",
    `${MODULE_ID} | fighters moved${reach.canAttack ? " — in strike range" : ` — ${Math.round(reach.distanceToTarget)}mu short`}`
  );
}

/**
 * Launch-Fighters tool (GM): a controlled carrier (a ship with fighter bays)
 * deploys one 6-fighter group token beside it, up to its bay capacity. The
 * carrier tracks how many groups are out via a flag. A launched group is a fresh
 * full-strength group (the bay's contents are not individually modelled).
 */
export async function launchFightersAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM launches fighters`);
    return;
  }
  const carrier = controlledToken();
  if (!carrier?.actor) {
    return;
  }
  const bays = Number(carrier.actor.system?.bays ?? 0);
  if (bays <= 0) {
    notify("warn", `${MODULE_ID} | that ship has no fighter bays (set system.bays)`);
    return;
  }
  const deployed = Number(carrier.actor.getFlag?.(MODULE_ID, LAUNCHED_GROUPS_FLAG) ?? 0);
  if (deployed >= bayCapacity(bays).groups) {
    notify("info", `${MODULE_ID} | all ${bays} bay(s) are empty -- recover a group first`);
    return;
  }

  const disposition = Number(carrier.document?.disposition ?? 0);
  const start = tokenStartPx(carrier);
  const scale = tokenScale(carrier);
  const offset = (carrier?.w ?? 0) / 2 + 2 * scale;
  const group = await g().Actor?.create?.({
    name: `${carrier.name ?? "Carrier"} Wing ${deployed + 1}`,
    type: `${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`,
    system: { size: FIGHTER_GROUP_MAX }
  });
  if (!group?.getTokenDocument) {
    notify("error", `${MODULE_ID} | could not create the fighter group`);
    return;
  }
  // Link the token to its actor so recovery can delete both cleanly (an unlinked
  // token owns a synthetic actor that vanishes with the token, double-deleting).
  const td = await group.getTokenDocument({ x: start.x + offset, y: start.y - offset, disposition, width: 1, height: 1, actorLink: true });
  await carrier.document?.parent?.createEmbeddedDocuments?.("Token", [td.toObject()]);
  await carrier.actor.setFlag?.(MODULE_ID, LAUNCHED_GROUPS_FLAG, deployed + 1);
  notify("info", `${MODULE_ID} | launched a fighter group (${deployed + 1}/${bayCapacity(bays).groups} bays used)`);
}

/**
 * Recover-Fighters tool (GM): a controlled carrier lands the nearest friendly
 * fighter group within docking reach (removing its token + actor), freeing a bay.
 */
export async function recoverFightersAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM recovers fighters`);
    return;
  }
  const services = api();
  const carrier = controlledToken();
  if (!services || !carrier?.actor) {
    return;
  }
  const deployed = Number(carrier.actor.getFlag?.(MODULE_ID, LAUNCHED_GROUPS_FLAG) ?? 0);
  const disposition = Number(carrier.document?.disposition ?? 0);
  // Nearest friendly fighter group within its own move + docking reach of the carrier.
  const groups = (g().canvas?.tokens?.placeables ?? []).filter(
    (t: any) => typeof t?.actor?.type === "string" && t.actor.type.endsWith(FIGHTER_GROUP_ACTOR_TYPE) && Number(t?.document?.disposition ?? 0) === disposition
  );
  let best: { token: any; distance: number } | undefined;
  for (const gp of groups) {
    const distance = services.measure.between(gp, carrier, "centre-to-centre").distance;
    if (distance <= FIGHTER_ATTACK_RANGE_MU && (!best || distance < best.distance)) {
      best = { token: gp, distance };
    }
  }
  if (!best) {
    notify("warn", `${MODULE_ID} | no friendly fighter group within ${FIGHTER_ATTACK_RANGE_MU}mu to recover`);
    return;
  }
  const groupActor = best.token.actor;
  // Decrement the bay count FIRST so a delete hiccup can't strand the flag.
  await carrier.actor.setFlag?.(MODULE_ID, LAUNCHED_GROUPS_FLAG, Math.max(0, deployed - 1));
  try {
    await best.token.document?.delete?.();
    await groupActor?.delete?.();
  } catch {
    /* the token may take its (linked) actor with it; a leftover is harmless */
  }
  notify("info", `${MODULE_ID} | recovered a fighter group (${Math.max(0, deployed - 1)} still out)`);
}

/**
 * Fire-Arcs tool: pin/unpin the fire-arc ring on ship tokens so a player can see
 * their fleet's arcs at a glance (hovering already shows a ship's arcs transiently
 * — this keeps them on). Toggles the controlled ships, or every ship on the scene
 * if none is selected: if any are pinned it clears all, else it pins all.
 */
export function toggleArcsAction(): void {
  const isShip = (t: any) => typeof t?.actor?.type === "string" && t.actor.type.endsWith(SHIP_ACTOR_TYPE);
  const controlled = (g().canvas?.tokens?.controlled ?? []).filter(isShip);
  const ships = controlled.length > 0 ? controlled : (g().canvas?.tokens?.placeables ?? []).filter(isShip);
  if (ships.length === 0) {
    notify("info", `${MODULE_ID} | no ship tokens to show fire arcs for`);
    return;
  }
  const wantPinned = !ships.some(isArcPinned);
  for (const t of ships) {
    if (isArcPinned(t) !== wantPinned) {
      toggleArcPin(t);
    }
  }
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
      content:
        `<div class="ft-plot-builder">` +
        `<div class="ft-plot-row"><label>Thrust</label>` +
        `<button type="button" data-thrust="-1">&minus;</button>` +
        `<span class="ft-thrust-val">0</span>` +
        `<button type="button" data-thrust="1">+</button></div>` +
        `<div class="ft-plot-row"><label>Turn</label>` +
        `<button type="button" data-turn="P2">P2</button>` +
        `<button type="button" data-turn="P1">P1</button>` +
        `<button type="button" data-turn="0">0</button>` +
        `<button type="button" data-turn="S1">S1</button>` +
        `<button type="button" data-turn="S2">S2</button></div>` +
        `</div>` +
        `<p>Order (editable — e.g. <code>+4,P2</code>):</p><input type="text" name="order" value="+0" autofocus />`,
      render: (_event: unknown, dlg: any) => {
        const root = dlg?.element;
        const input = root?.querySelector?.('input[name="order"]');
        const thrustVal = root?.querySelector?.(".ft-thrust-val");
        let thrust = 0;
        let turn = "0";
        const rebuild = () => {
          const t = `${thrust >= 0 ? "+" : ""}${thrust}`;
          const order = turn && turn !== "0" ? `${t},${turn}` : t;
          if (input) input.value = order;
          if (thrustVal) thrustVal.textContent = String(thrust);
          redraw(order);
        };
        root?.querySelectorAll?.("[data-thrust]").forEach((btn: any) => {
          btn.addEventListener?.("click", () => {
            thrust = Math.max(-8, Math.min(8, thrust + Number(btn.dataset.thrust)));
            rebuild();
          });
        });
        root?.querySelectorAll?.("[data-turn]").forEach((btn: any) => {
          btn.addEventListener?.("click", () => {
            turn = btn.dataset.turn;
            rebuild();
          });
        });
        // The raw input stays authoritative if the player types directly.
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

/** The engine's activation-order service, or undefined when absent. */
function roundsApi(): RoundsApiLike | undefined {
  return api()?.rounds;
}

/** The active fire order restored from state + freshly-gathered ships, or undefined. */
function activeFireOrder(): ActivationOrderLike | undefined {
  const state = loadFireState();
  const rounds = roundsApi();
  if (!state || !rounds) {
    return undefined;
  }
  return restoreFireOrder(rounds, collectFireShips(g().canvas?.tokens?.placeables ?? []), state);
}

/**
 * Advances the fire order after `shipId` has fired: activates it in the engine
 * order, then either saves the new state (announcing the next side) or clears the
 * phase when every ship has fired.
 */
async function advanceFireOrder(order: ActivationOrderLike, shipId: string): Promise<void> {
  const doc = firePhaseDoc();
  try {
    order.activate(shipId);
  } catch {
    return; // out-of-turn / already-fired: the enforcement check should prevent this
  }
  if (order.isComplete()) {
    await doc?.unsetFlag(MODULE_ID, FIRE_PHASE_FLAG);
  } else {
    await doc?.setFlag(MODULE_ID, FIRE_PHASE_FLAG, order.serialize());
  }
  // Announce the tracker to everyone (persistent card), not a GM-only toast.
  await announceFirePhase(order);
}

/** Posts the visible fire-phase tracker line as a chat card for all players. */
async function announceFirePhase(order: ActivationOrderLike): Promise<void> {
  const line = escapeHtml(firePhaseStatusLine(order));
  await g().ChatMessage?.create({
    content: `<div class="ft-fire-report ft-phase-status"><p><strong>Fire phase:</strong> ${line}</p></div>`
  });
}

/**
 * Phase-Status tool (GM): re-post the current fire-phase tracker on demand, so a
 * player who missed the announcement can see whose turn it is. No-op with a note
 * when no fire phase is running.
 */
export async function phaseStatusAction(): Promise<void> {
  const order = activeFireOrder();
  if (!order) {
    notify("info", `${MODULE_ID} | no fire phase is running (use Begin Fire Phase)`);
    return;
  }
  await announceFirePhase(order);
}

const MAX_INITIATIVE_REROLLS = 5;

/**
 * Begin-Fire-Phase action (GM): roll initiative (one die per side, re-rolling
 * ties), then open the ENGINE's activation order (default alternation) from the
 * winning side. State is persisted to a Document so it survives reload and syncs.
 */
export async function beginFirePhaseAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM begins the fire phase`);
    return;
  }
  const services = api();
  const rounds = services?.rounds;
  if (!rounds) {
    notify("error", `${MODULE_ID} | the battleframe rounds service was not found`);
    return;
  }
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

  const order = createFireOrder(rounds, ships, firstSideId);
  await firePhaseDoc()?.setFlag(MODULE_ID, FIRE_PHASE_FLAG, order.serialize());
  await announceFirePhase(order);
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
 * New-Battle tool (GM): a full reset — after a confirm, restores every ship's
 * damage (hull/armour/systems/weapons) and clears defeated, then wipes the
 * transient battle state (plots, fire phase, in-flight missiles). For starting a
 * fresh engagement with the same fleets without re-importing.
 */
export async function newBattleAction(): Promise<void> {
  if (!isGM()) {
    notify("warn", `${MODULE_ID} | only the GM resets the battle`);
    return;
  }
  const confirm = g().foundry?.applications?.api?.DialogV2 as any;
  if (confirm?.confirm) {
    const ok = await confirm.confirm({
      window: { title: "Full Thrust: New Battle" },
      content: `<p>Restore ALL ships to undamaged and clear plots, the fire phase, and in-flight missiles?</p>`
    });
    if (!ok) {
      return;
    }
  }
  const defeatedId = (g() as any).CONFIG?.specialStatusEffects?.DEFEATED ?? "dead";
  const tokens = g().canvas?.tokens?.placeables ?? [];
  let ships = 0;
  for (const token of tokens) {
    const actor = token?.actor;
    if (typeof actor?.type !== "string" || !actor.type.endsWith(SHIP_ACTOR_TYPE)) {
      continue;
    }
    const weapons = ((actor.system?.weapons ?? []) as any[]).map((w) => ({ ...w, destroyed: false, spent: false }));
    await actor.update({
      "system.hull.damage": 0,
      "system.armour.damage": 0,
      "system.driveHits": 0,
      "system.fcsLost": 0,
      "system.screensLost": 0,
      "system.pdsLost": 0,
      "system.weapons": weapons
    });
    await actor.unsetFlag?.(MODULE_ID, PLOTTED_ORDER_FLAG);
    await actor.toggleStatusEffect?.(defeatedId, { active: false });
    await syncShipStatuses({
      token,
      system: actor.system,
      update: (d: Record<string, unknown>) => actor.update(d),
      toggleStatusEffect: (id: string, o: { active: boolean }) => actor.toggleStatusEffect(id, o)
    } as any);
    ships += 1;
  }
  await firePhaseDoc()?.unsetFlag(MODULE_ID, FIRE_PHASE_FLAG);
  await saveMissiles([]);
  clearMovementPreview();
  notify("info", `${MODULE_ID} | new battle -- reset ${ships} ship(s); cleared plots, fire phase, missiles`);
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
  };
  // Re-post the current fire-phase tracker (whose side fires next) -- GM only.
  const phaseStatusTool = {
    name: "full-thrust-phase-status",
    title: "battleframe-full-thrust.controls.phaseStatus",
    icon: "fas fa-list-ol",
    button: true,
    visible: gm,
    order: 0,
    onClick: () => void phaseStatusAction(),
  };
  const fireTool = {
    name: "full-thrust-fire",
    title: "battleframe-full-thrust.controls.fire",
    icon: "fas fa-crosshairs",
    button: true,
    visible: gm,
    order: 1,
    onClick: () => void fireAction(),
  };
  // Multi-FCS split fire: divide weapons across every targeted ship -- GM only.
  const splitFireTool = {
    name: "full-thrust-split-fire",
    title: "battleframe-full-thrust.controls.splitFire",
    icon: "fas fa-arrows-split-up-and-left",
    button: true,
    visible: gm,
    order: 1,
    onClick: () => void splitFireAction(),
  };
  // Toggle the fire-arc ring overlay on ship tokens -- any player.
  const arcsTool = {
    name: "full-thrust-arcs",
    title: "battleframe-full-thrust.controls.arcs",
    icon: "fas fa-compass-drafting",
    button: true,
    visible: true,
    order: 2,
    onClick: () => void toggleArcsAction(),
  };
  // Pre-fire targeting check: which weapons bear + their range band -- any player
  // (it only reads their own ship's reach; the card is whispered to them).
  const targetingTool = {
    name: "full-thrust-targeting",
    title: "battleframe-full-thrust.controls.targeting",
    icon: "fas fa-bullseye",
    button: true,
    visible: true,
    order: 2,
    onClick: () => void checkTargetingAction(),
  };
  const needleTool = {
    name: "full-thrust-needle",
    title: "battleframe-full-thrust.controls.needle",
    icon: "fas fa-syringe",
    button: true,
    visible: gm,
    order: 2,
    onClick: () => void needleAction(),
  };
  const salvoTool = {
    name: "full-thrust-salvo",
    title: "battleframe-full-thrust.controls.salvo",
    icon: "fas fa-meteor",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void salvoAction(),
  };
  // Launch an independent missile forward from the controlled ship -- GM only.
  const launchMissileTool = {
    name: "full-thrust-launch-missile",
    title: "battleframe-full-thrust.controls.launchMissile",
    icon: "fas fa-rocket",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void launchMissileAction(),
  };
  // Run the missile phase: advance every missile, resolve strikes -- GM only.
  const advanceMissilesTool = {
    name: "full-thrust-advance-missiles",
    title: "battleframe-full-thrust.controls.advanceMissiles",
    icon: "fas fa-forward-fast",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void advanceMissilesAction(),
  };
  // Spinal-mount mega-weapons (direct-target) -- GM only.
  const novaCannonTool = {
    name: "full-thrust-nova-cannon",
    title: "battleframe-full-thrust.controls.novaCannon",
    icon: "fas fa-sun",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void fireNovaCannonAction(),
  };
  const chargeWaveGunTool = {
    name: "full-thrust-charge-wave-gun",
    title: "battleframe-full-thrust.controls.chargeWaveGun",
    icon: "fas fa-bolt",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void chargeWaveGunAction(),
  };
  const waveGunTool = {
    name: "full-thrust-wave-gun",
    title: "battleframe-full-thrust.controls.waveGun",
    icon: "fas fa-water",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void fireWaveGunAction(),
  };
  // Carrier ops: launch / recover fighter groups -- GM only.
  const launchFightersTool = {
    name: "full-thrust-launch-fighters",
    title: "battleframe-full-thrust.controls.launchFighters",
    icon: "fas fa-plane-departure",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void launchFightersAction(),
  };
  const recoverFightersTool = {
    name: "full-thrust-recover-fighters",
    title: "battleframe-full-thrust.controls.recoverFighters",
    icon: "fas fa-plane-arrival",
    button: true,
    visible: gm,
    order: 3,
    onClick: () => void recoverFightersAction(),
  };
  // Move the controlled fighter group toward the targeted ship -- any player.
  const fighterMoveTool = {
    name: "full-thrust-fighter-move",
    title: "battleframe-full-thrust.controls.fighterMove",
    icon: "fas fa-jet-fighter",
    button: true,
    visible: true,
    order: 3,
    onClick: () => void fighterMoveAction(),
  };
  const plotTool = {
    name: "full-thrust-plot",
    title: "battleframe-full-thrust.controls.plot",
    icon: "fas fa-route",
    button: true,
    visible: true,
    order: 2,
    onClick: () => void plotAction(),
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
  };
  // Full reset: restore all ships + clear plots/fire phase/missiles -- GM only.
  const newBattleTool = {
    name: "full-thrust-new-battle",
    title: "battleframe-full-thrust.controls.newBattle",
    icon: "fas fa-arrows-rotate",
    button: true,
    visible: gm,
    order: 8,
    onClick: () => void newBattleAction(),
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

  const tools = [initiativeTool, phaseStatusTool, fireTool, splitFireTool, arcsTool, targetingTool, needleTool, salvoTool, launchMissileTool, advanceMissilesTool, novaCannonTool, chargeWaveGunTool, waveGunTool, launchFightersTool, recoverFightersTool, fighterMoveTool, plotTool, executeTool, damageControlTool, newTurnTool, newBattleTool, importTool];
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

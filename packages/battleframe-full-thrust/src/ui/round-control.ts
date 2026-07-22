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

import { MODULE_ID, FIGHTER_GROUP_ACTOR_TYPE } from "../constants";
import { fireShipAtTarget, type FireContext, type FireReport, type FiringShip } from "../combat/fire-ship";
import { fireFighterGroupAtTarget, type FighterFireReport } from "../combat/fire-fighters";
import { parseOrder, applyOrder } from "../movement/orders";
import { COURSE_POINT_DEGREES } from "../constants";

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

/** Builds the chat-card HTML summarising one ship's fire at a target. */
export function buildFireReportHtml(report: FireReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);

  const lines: string[] = [];
  lines.push(`<div class="ft-fire-report">`);
  lines.push(`<h3>${attacker} &rarr; ${target}</h3>`);
  lines.push(
    `<p>Range ${Math.round(report.distance)}mu &middot; <strong>${report.totalDamage}</strong> damage.</p>`
  );

  if (report.thresholdsCrossed.length > 0) {
    lines.push(
      `<p>Threshold check (row ${report.thresholdsCrossed.join(", ")}): ` +
        `<strong>${report.systemsKnockedOut}</strong> system(s) knocked out.</p>`
    );
  }
  if (report.destroyed) {
    lines.push(`<p class="ft-destroyed"><strong>${target} destroyed.</strong></p>`);
  }
  lines.push(`</div>`);
  return lines.join("");
}

/** Builds the chat-card HTML summarising a fighter group's attack on a ship. */
export function buildFighterReportHtml(report: FighterFireReport, names: FireReportNames): string {
  const attacker = escapeHtml(names.attacker);
  const target = escapeHtml(names.target);

  if (!report.fired) {
    return `<div class="ft-fire-report"><h3>${attacker} &rarr; ${target}</h3>` +
      `<p>No attack (${escapeHtml(report.reason ?? "unable")}).</p></div>`;
  }

  const lines: string[] = [];
  lines.push(`<div class="ft-fire-report">`);
  lines.push(`<h3>${attacker} (fighters) &rarr; ${target}</h3>`);
  lines.push(`<p>Range ${Math.round(report.distance)}mu &middot; <strong>${report.totalDamage}</strong> damage.</p>`);
  if (report.thresholdsCrossed.length > 0) {
    lines.push(
      `<p>Threshold check (row ${report.thresholdsCrossed.join(", ")}): ` +
        `<strong>${report.systemsKnockedOut}</strong> system(s) knocked out.</p>`
    );
  }
  if (report.destroyed) {
    lines.push(`<p class="ft-destroyed"><strong>${target} destroyed.</strong></p>`);
  }
  lines.push(`</div>`);
  return lines.join("");
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

/** Applies a plotted movement order to a ship's velocity/course. */
export function resolvePlotOrder(
  system: { velocity?: number; course?: number; thrust?: number },
  orderText: string
): ReturnType<typeof applyOrder> {
  return applyOrder(
    { velocity: system.velocity ?? 0, course: system.course ?? 12 },
    parseOrder(orderText),
    system.thrust ?? 0
  );
}

// --- Foundry glue -----------------------------------------------------------

interface GlobalScope {
  game?: {
    user?: { isGM?: boolean };
    battleframe?: RoundControlApi;
    i18n?: { localize?: (k: string) => string };
  };
  battleframe?: RoundControlApi;
  canvas?: { tokens?: { controlled?: any[] } };
  ui?: { notifications?: { warn?: (t: string) => void; error?: (t: string) => void; info?: (t: string) => void } };
  Hooks?: { on?: (event: string, cb: (...args: unknown[]) => void) => void };
  ChatMessage?: { create: (data: Record<string, unknown>) => Promise<unknown> };
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
  const targets = (g().game as any)?.user?.targets;
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

  const { html } = await resolveFireBetween(attacker, target, services);
  await g().ChatMessage?.create({ content: html });
}

/** Plot-tool action: prompt for a movement order and apply it to the ship. */
export async function plotAction(): Promise<void> {
  const token = controlledToken();
  if (!token?.actor) {
    return;
  }
  const dialog = g().foundry?.applications?.api?.DialogV2;
  let orderText = "";
  if (dialog?.prompt) {
    const value = (await dialog.prompt({
      window: { title: "Full Thrust: Movement Order" },
      content: `<p>Order (e.g. <code>+4,P2</code>):</p><input type="text" name="order" autofocus />`,
      ok: {
        label: "Plot",
        callback: (_event: unknown, button: any) => button?.form?.elements?.order?.value ?? ""
      }
    })) as string;
    orderText = value ?? "";
  }

  const system = token.actor.system ?? {};
  const result = resolvePlotOrder(system, orderText);
  if (!result.legal) {
    notify("warn", `${MODULE_ID} | illegal order (${result.reason})`);
    return;
  }

  await token.actor.update({ "system.velocity": result.velocity, "system.course": result.course });
  // Face the ship along its new course (cinematic movement: facing == heading).
  await token.document?.update?.({ rotation: (result.course % 12) * COURSE_POINT_DEGREES });
  notify("info", `${MODULE_ID} | velocity ${result.velocity}, course ${result.course}`);
}

/** Adds the Full Thrust scene control, tolerating both payload shapes. */
export function addSceneControl(controls: unknown): void {
  const gm = isGM();
  const fireTool = {
    name: "full-thrust-fire",
    title: "battleframe-full-thrust.controls.fire",
    icon: "fas fa-crosshairs",
    button: true,
    visible: gm,
    order: 0,
    onClick: () => void fireAction(),
    onChange: () => void fireAction()
  };
  const plotTool = {
    name: "full-thrust-plot",
    title: "battleframe-full-thrust.controls.plot",
    icon: "fas fa-route",
    button: true,
    visible: true,
    order: 1,
    onClick: () => void plotAction(),
    onChange: () => void plotAction()
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

  if (Array.isArray(controls)) {
    control.tools = [fireTool, plotTool];
    controls.push(control);
    return;
  }
  if (controls && typeof controls === "object") {
    control.tools = { [fireTool.name]: fireTool, [plotTool.name]: plotTool };
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

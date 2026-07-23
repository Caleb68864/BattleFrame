import { MODULE_ID, UNIT_ACTOR_TYPE, VEHICLE_ACTOR_TYPE, INFANTRY_ACTOR_TYPE, UNIT_ID_FLAG } from "../constants";
import {
  createDirtsideRound,
  restoreDirtsideRound,
  firstChooser,
  type DirtsideUnit,
  type DirtsideRoundState,
} from "../round/session";

/**
 * G3/G4 — the round-control scene tools. Testable core at the top (round-state
 * construction, the Turn-End reset, the scene-control payload); Foundry glue at
 * the bottom (canvas reads, Combat-flag persistence, activation).
 *
 * Activation iterates UNITS (the token-less `dirtside-ii.unit` grouping actors,
 * per A10); a player activates by selecting one of their unit's element tokens.
 * Turn-End clears every unit's activated + underFire and is registered as the
 * engine's GM-less advance callback (G4).
 */

export interface RoundUnit extends DirtsideUnit {
  name?: string;
}

/** Distinct side ids present among the units, first-seen order. */
export function unitSidesOf(units: readonly RoundUnit[]): string[] {
  return [...new Set(units.map((u) => u.playerId))];
}

export interface BeginRoundStateResult {
  state: DirtsideRoundState;
  /** The side that got to choose first (fewer units), or null on a tie. */
  firstChooserId: string | null;
  tie: boolean;
}

/**
 * Builds the initial serialized round state: the fewer-units side chooses first;
 * on a tie the caller rolls off, but a deterministic first side still seeds a
 * playable state so the round is never stuck.
 */
export function beginRoundState(units: readonly RoundUnit[]): BeginRoundStateResult {
  const chooser = firstChooser(units);
  const firstPlayerId = chooser ?? unitSidesOf(units)[0];
  const round = createDirtsideRound(units, firstPlayerId);
  return { state: round.serialize(), firstChooserId: chooser, tie: chooser === null };
}

/** The Turn-End field reset applied to every unit actor (G4). */
export function turnEndUpdate(): Record<string, unknown> {
  return { "system.activated": false, "system.underFire": false };
}

/* ------------------------------------------------------------------------ *
 * Foundry glue — UNVERIFIED against a live v14 (parent live-verifies). The
 * canvas/token reads and Combat-flag writes are feature-detected; nothing below
 * is exercised by the unit suite.
 * ------------------------------------------------------------------------ */

const ELEMENT_TYPES = [`${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`, `${MODULE_ID}.${INFANTRY_ACTOR_TYPE}`];
const UNIT_TYPE = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;
const FLAG_SCOPE = MODULE_ID;
const ROUND_FLAG = "round";

function glob(): any {
  return globalThis as any;
}

export function isGM(): boolean {
  return glob().game?.user?.isGM === true;
}

function notify(message: string, level: "info" | "warn" | "error" = "info"): void {
  const n = glob().ui?.notifications;
  if (typeof n?.[level] === "function") {
    n[level](message);
  } else {
    console.log(`${MODULE_ID} | ${message}`);
  }
}

function localize(suffix: string): string {
  const key = `${MODULE_ID}.${suffix}`;
  return glob().game?.i18n?.localize?.(key) ?? key;
}
function format(suffix: string, data: Record<string, unknown>): string {
  const key = `${MODULE_ID}.${suffix}`;
  return glob().game?.i18n?.format?.(key, data) ?? key;
}

function sideFromDisposition(disposition: number | undefined): string {
  return (disposition ?? 0) < 0 ? "hostile" : "friendly";
}

/**
 * Gathers the round's UNITS from the canvas: every element token maps up to its
 * `unitId` flag; a unit is present (and takes its side from its first element's
 * disposition) once at least one of its elements is on the table.
 */
export function gatherUnitsFromCanvas(): RoundUnit[] {
  const placeables = (glob().canvas?.tokens?.placeables ?? []) as any[];
  const byUnit = new Map<string, RoundUnit>();
  const actors = glob().game?.actors;

  for (const token of placeables) {
    const actor = token?.actor;
    if (!actor || !ELEMENT_TYPES.includes(actor.type)) {
      continue;
    }
    const unitId = actor.getFlag?.(FLAG_SCOPE, UNIT_ID_FLAG) ?? actor.flags?.[FLAG_SCOPE]?.[UNIT_ID_FLAG];
    if (!unitId || byUnit.has(unitId)) {
      continue;
    }
    const unitActor = actors?.get?.(unitId);
    byUnit.set(unitId, {
      id: unitId,
      name: unitActor?.name ?? unitId,
      playerId: sideFromDisposition(token?.document?.disposition),
      // A unit is never "destroyed" for activation purposes (its elements die,
      // not the grouping); the session's isDestroyed stays unset.
    });
  }
  return [...byUnit.values()];
}

function activeRoundCombat(): any | undefined {
  const g = glob().game;
  const candidates = [g?.combat, g?.combats?.active, ...(g?.combats?.contents ?? [])];
  return candidates.find((c: any) => c && c.getFlag?.(FLAG_SCOPE, ROUND_FLAG));
}

async function getOrCreateCombat(): Promise<any | undefined> {
  const g = glob();
  const existing = g.game?.combat ?? g.game?.combats?.active;
  if (existing) return existing;
  return g.Combat?.create ? g.Combat.create({ scene: g.canvas?.scene?.id }) : undefined;
}

/** "End Turn / New Round": resets markers then opens a fresh round (the advance callback, G4). */
export async function advanceTurnCore(): Promise<void> {
  // Clear every unit's per-turn markers.
  const actors = (glob().game?.actors?.contents ?? glob().game?.actors ?? []) as any[];
  for (const actor of actors) {
    if (actor?.type === UNIT_TYPE) {
      try {
        await actor.update?.(turnEndUpdate());
      } catch {
        /* keep going */
      }
    }
  }
  await advanceRoundCore();
}

/** Rolls first-chooser and opens a fresh round, refusing while one is in progress. */
export async function advanceRoundCore(): Promise<void> {
  const units = gatherUnitsFromCanvas();
  if (units.length === 0) {
    notify(localize("controls.round.noUnits"), "warn");
    return;
  }

  const existing = activeRoundCombat();
  if (existing) {
    const state = existing.getFlag(FLAG_SCOPE, ROUND_FLAG) as DirtsideRoundState | undefined;
    if (state) {
      const round = restoreDirtsideRound(units, state);
      if (!round.isComplete()) {
        notify(localize("controls.round.inProgress"), "warn");
        return;
      }
    }
  }

  try {
    const { state, tie, firstChooserId } = beginRoundState(units);
    const combat = existing ?? (await getOrCreateCombat());
    if (!combat) {
      notify(localize("controls.round.noApi"), "error");
      return;
    }
    await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, state);
    if (combat.startCombat) {
      try {
        await combat.startCombat();
      } catch {
        /* already started */
      }
    }
    if (tie) {
      notify(localize("controls.round.tie"), "warn");
    }
    notify(format("controls.round.started", { side: firstChooserId ?? state.firstPlayerId }));
  } catch (error) {
    notify(error instanceof Error ? error.message : String(error), "error");
  }
}

/** "Activate Unit": marks the selected element's unit activated, advancing the alternation. */
export async function activateSelectedControl(): Promise<void> {
  const combat = activeRoundCombat();
  const state = combat?.getFlag(FLAG_SCOPE, ROUND_FLAG) as DirtsideRoundState | undefined;
  if (!combat || !state) {
    notify(localize("controls.activate.noRound"), "warn");
    return;
  }

  const controlled = (glob().canvas?.tokens?.controlled ?? []) as any[];
  const firer = controlled.find((t) => ELEMENT_TYPES.includes(t?.actor?.type));
  const unitId =
    firer?.actor?.getFlag?.(FLAG_SCOPE, UNIT_ID_FLAG) ??
    firer?.actor?.flags?.[FLAG_SCOPE]?.[UNIT_ID_FLAG];
  if (!unitId) {
    notify(localize("controls.activate.noSelection"), "warn");
    return;
  }

  const round = restoreDirtsideRound(gatherUnitsFromCanvas(), state);
  try {
    round.activate(unitId);
  } catch (error) {
    notify(error instanceof Error ? error.message : localize("controls.activate.notYourTurn"), "warn");
    return;
  }

  // Mark the unit's command marker + persist the advanced order.
  const unitActor = glob().game?.actors?.get?.(unitId);
  await unitActor?.update?.({ "system.activated": true });
  await combat.setFlag(FLAG_SCOPE, ROUND_FLAG, round.serialize());
  if (round.isComplete()) {
    await combat.unsetFlag?.(FLAG_SCOPE, ROUND_FLAG);
    notify(localize("controls.round.complete"));
  }
}

/** Ready toggle (every player) → the engine's GM-less advance countdown. */
export async function readyAction(): Promise<void> {
  const advance = glob().game?.battleframe?.advance ?? glob().battleframe?.advance;
  if (!advance?.toggleReady) {
    notify(localize("controls.round.noApi"), "warn");
    return;
  }
  await advance.toggleReady();
  const status = advance.status?.();
  notify(
    format("controls.ready.status", {
      state: advance.isReady?.() ? "READY" : "not ready",
      ready: status?.ready?.length ?? 0,
      total: status?.participants?.length ?? 0,
    })
  );
}

function currentUserReady(): boolean {
  const advance = glob().game?.battleframe?.advance ?? glob().battleframe?.advance;
  return advance?.isReady?.() === true;
}

/**
 * Scene-control handlers fire async Foundry writes (setFlag / actor.update /
 * dice). A `void handler()` would turn a rejecting write into an unhandled
 * promise rejection with no user feedback. Every scene-tool `onClick`/`onChange`
 * routes through this instead: a rejection is caught, logged, and surfaced via
 * the module's notify path (mirrors the internal try/catch GREATHELM / Simple
 * Skirmish already carry). Success is unchanged — the handler runs as before.
 */
function runGuarded(fn: () => unknown): void {
  Promise.resolve()
    .then(fn)
    .catch((error) => {
      console.warn(`${MODULE_ID} | action failed`, error);
      notify(`${MODULE_ID} | action failed -- see console`, "error");
    });
}

/** The scene-control entry (both known payload shapes). */
export function addSceneControl(controls: unknown): void {
  const readyTool = {
    name: "dirtside-ii-ready",
    title: `${MODULE_ID}.controls.ready.tool`,
    icon: "fas fa-hourglass-half",
    toggle: true,
    active: currentUserReady(),
    visible: true,
    order: 0,
    onChange: () => runGuarded(readyAction),
  };
  const activateTool = {
    name: "dirtside-ii-activate",
    title: `${MODULE_ID}.controls.activate.tool`,
    icon: "fas fa-crosshairs",
    button: true,
    visible: true,
    order: 1,
    onClick: () => runGuarded(activateSelectedControl),
    onChange: () => runGuarded(activateSelectedControl),
  };
  const endTurnTool = {
    name: "dirtside-ii-end-turn",
    title: `${MODULE_ID}.controls.activate.run`,
    icon: "fas fa-flag-checkered",
    button: true,
    visible: isGM(),
    order: 2,
    onClick: () => runGuarded(advanceTurnCore),
    onChange: () => runGuarded(advanceTurnCore),
  };

  const control = {
    name: MODULE_ID,
    title: `${MODULE_ID}.controls.round.title`,
    icon: "fas fa-truck-monster",
    layer: "tokens",
    visible: true,
    order: 0,
    activeTool: readyTool.name,
    tools: {} as Record<string, unknown> | unknown[],
  };

  if (Array.isArray(controls)) {
    control.tools = [readyTool, activateTool, endTurnTool];
    controls.push(control);
    return;
  }
  if (controls && typeof controls === "object") {
    control.tools = {
      [readyTool.name]: readyTool,
      [activateTool.name]: activateTool,
      [endTurnTool.name]: endTurnTool,
    };
    (controls as Record<string, unknown>)[MODULE_ID] = control;
  }
}

export function registerRoundControl(): void {
  const hooks = glob().Hooks;
  if (!hooks?.on) {
    return;
  }
  hooks.on("getSceneControlButtons", (...args: unknown[]) => addSceneControl(args[0]));
}

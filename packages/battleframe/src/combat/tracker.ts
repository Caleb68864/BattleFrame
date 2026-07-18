import { SYSTEM_ID } from "../constants";
import { orderedCombatants } from "./battleframe-combat";
import type { CombatLike, TrackerRenderContext } from "./types";

export class MissingCombatTrackerBaseError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | no CombatTracker base class found on ` +
        "foundry.applications.sidebar.tabs.CombatTracker or the legacy " +
        "CombatTracker global"
    );
    this.name = "MissingCombatTrackerBaseError";
  }
}

export type CombatTrackerBaseConstructor = new (...args: any[]) => {
  viewed?: CombatLike;
};

/**
 * The exact v14 ApplicationV2 namespace for the combat tracker base
 * class is unconfirmed in project research (see SS-06 decisions in
 * docs/specs/2026-07-16-battleframe-core-mvp.md -- do not extrapolate
 * from the sheet-registration namespace note, that covers a different
 * registration path). Both the namespaced v14 location and the legacy
 * global are tried at call time, so a wrong guess does not get baked in
 * at import time.
 */
function resolveCombatTrackerBase(): CombatTrackerBaseConstructor {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        sidebar?: {
          tabs?: { CombatTracker?: CombatTrackerBaseConstructor };
        };
      };
    };
    CombatTracker?: CombatTrackerBaseConstructor;
  };

  const base =
    globalScope.foundry?.applications?.sidebar?.tabs?.CombatTracker ??
    globalScope.CombatTracker;

  if (!base) {
    throw new MissingCombatTrackerBaseError();
  }

  return base;
}

/**
 * Builds the tracker class against whatever CombatTracker base is
 * available (the real Foundry global, or an injected fake for tests).
 * Rendering order comes entirely from `orderedCombatants` -- the
 * tracker does not sort, and an empty order flag renders an empty list
 * rather than falling back to some other ordering.
 */
export function createBattleframeCombatTrackerClass(
  CombatTrackerBase: CombatTrackerBaseConstructor = resolveCombatTrackerBase()
): CombatTrackerBaseConstructor {
  class BattleframeCombatTracker extends (CombatTrackerBase as new (
    ...args: any[]
  ) => any) {
    async _prepareTrackerContext(
      context: TrackerRenderContext,
      _options: unknown
    ): Promise<TrackerRenderContext> {
      const combat = (this as unknown as { viewed?: CombatLike }).viewed;
      context.combatants = combat ? orderedCombatants(combat) : [];
      return context;
    }
  }

  return BattleframeCombatTracker as unknown as CombatTrackerBaseConstructor;
}

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

/**
 * Registers the Battleframe tracker as the system's combat UI. Core
 * owns this registration -- CONFIG.ui.combat is the only supported hook
 * point (see
 * vault/foundry-systems/lancer-activation-based-combat-precedent.md,
 * "own the tracker UI").
 */
export function registerBattleframeCombatTracker(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { ui?: { combat?: unknown } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.ui = globalScope.CONFIG.ui ?? {};
  globalScope.CONFIG.ui.combat = createBattleframeCombatTrackerClass();
}

if (hooksAvailable()) {
  Hooks.once("init", () => {
    registerBattleframeCombatTracker();
  });
}

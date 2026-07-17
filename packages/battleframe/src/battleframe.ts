import { SYSTEM_ID } from "./constants";
import { installBattleframeApi } from "./api/index";
import { registerGenericActorDataModel } from "./data/generic-actor";
import { installMeasurementApi } from "./measurement/measure";
import { registerBattleframeCombatTracker } from "./combat/tracker";
import { installDiceApi } from "./dice/dice";
import { registerGenericActorSheet } from "./applications/generic-actor-sheet";
import { registerBattleframeSettings } from "./settings";
import { createSetupWizardClass, openWizardIfNeeded } from "./applications/setup-wizard";
import { registerOrphanCheck } from "./rulesets/orphan-check";
import { rulesetRegistry } from "./rulesets/registry";

declare global {
  interface BattleframeGameNamespace {
    registry?: typeof rulesetRegistry;
  }
}

/**
 * Initialisation order matters: the base model, measurement, combat
 * tracker, dice, and generic actor sheet must exist on `game.battleframe`
 * (or `CONFIG`) before a ruleset's own `init` hook runs and tries to
 * register against them or call `registerRuleset`. Settings (and the
 * settings menu that opens the wizard) are registered last in `init`
 * since nothing else in `init` depends on them; the wizard itself only
 * reads settings at `ready`.
 */
function initCore(): void {
  registerGenericActorDataModel();
  installMeasurementApi();
  registerBattleframeCombatTracker();
  installDiceApi();
  registerGenericActorSheet();

  const api = installBattleframeApi();

  if (typeof game !== "undefined" && game) {
    game.battleframe = {
      ...(game.battleframe ?? {}),
      api,
      registry: rulesetRegistry,
    };
  }

  registerBattleframeSettings(
    createSetupWizardClass() as unknown as new (...args: any[]) => unknown
  );

  console.log(`${SYSTEM_ID} | core services initialised`);
}

function readyCore(): void {
  registerOrphanCheck();
  openWizardIfNeeded();

  console.log(`${SYSTEM_ID} | system ready`);
}

Hooks.once("init", () => {
  initCore();
});

Hooks.once("ready", () => {
  readyCore();
});

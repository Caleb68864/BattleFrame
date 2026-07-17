import { installBattleframeApi } from "./api/index";
import { createBattleframeCombatClass } from "./combat/battleframe-combat";
import { SYSTEM_ID } from "./constants";
import { installDiceApi } from "./dice/dice";
import { installMeasurementApi } from "./measurement/measure";
import { registerBattleframeSettings } from "./settings";
import {
  createSetupWizardClass,
  type ActorSheetV2BaseConstructor,
} from "./applications/setup-wizard";

// Side-effect imports. Each of these modules registers its own Foundry
// hooks at module scope; they need importing, not calling.
//   ./hooks                        -> registerBattleframeHooks() at module scope
//   ./combat/tracker               -> CONFIG.ui.combat at "init"
//   ./data/generic-actor           -> generic Actor data model at "init"
//   ./applications/generic-actor-sheet -> generic Actor sheet at "init"
//   ./rulesets/orphan-check        -> orphan warning at "ready"
//   ./applications/setup-wizard    -> openWizardIfNeeded() at "ready"
import "./hooks";
import "./combat/tracker";
import "./data/generic-actor";
import "./applications/generic-actor-sheet";
import "./rulesets/orphan-check";
import "./applications/setup-wizard";

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

/**
 * Builds the wizard class for the settings menu entry. The wizard extends
 * ApplicationV2, which only exists once Foundry has populated
 * `foundry.applications.api` -- if it is missing we register the settings
 * without the menu rather than letting a throw take the whole `init` down
 * with it. The settings themselves matter more than the menu: the wizard
 * reads them at `ready` and throws "not a registered game setting" if they
 * never got registered.
 */
function resolveWizardClass(): ActorSheetV2BaseConstructor | undefined {
  try {
    return createSetupWizardClass();
  } catch (error) {
    console.warn(`${SYSTEM_ID} | setup wizard menu unavailable`, error);
    return undefined;
  }
}

/**
 * Sets the system's Combat document class. Battleframe has no initiative
 * model, so the subclass neuters `setInitiative` -- see
 * ./combat/battleframe-combat. Must happen at `init`, before any Combat
 * document is constructed.
 */
function registerCombatDocumentClass(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Combat?: { documentClass?: unknown } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Combat = globalScope.CONFIG.Combat ?? {};
  globalScope.CONFIG.Combat.documentClass = createBattleframeCombatClass();
}

/**
 * Wires core at `init`. `game.battleframe.api` is installed first: ruleset
 * modules call `game.battleframe.api.registerRuleset` from their own `init`,
 * and this system's `init` listener is registered at import time -- before
 * any module's -- so the namespace exists by the time they look for it.
 * `./hooks` installs the api too; doing it here as well is harmless (the
 * ruleset registry behind it is a module singleton) and keeps the entry
 * point's ordering guarantee independent of import side effects.
 */
export function initialiseBattleframe(): void {
  installBattleframeApi();
  installMeasurementApi();
  installDiceApi();

  registerBattleframeSettings(resolveWizardClass());
  registerCombatDocumentClass();

  console.log(`${SYSTEM_ID} | initialised`);
}

if (hooksAvailable()) {
  Hooks.once("init", () => {
    initialiseBattleframe();
  });

  Hooks.once("ready", () => {
    console.log(`${SYSTEM_ID} | system ready`);
  });
}

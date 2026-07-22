import { bindBattleframeNamespace, installBattleframeApi } from "./api/index";
import { createBattleframeCombatClass } from "./combat/battleframe-combat";
import { SYSTEM_ID } from "./constants";
import { installAreaApi } from "./areas/area";
import { installDiceApi } from "./dice/dice";
import { installMeasurementApi } from "./measurement/measure";
import { installFacingApi } from "./measurement/facing";
import { installRoundsApi } from "./rounds/activation";
import { installLosApi } from "./vision/los";
import { installHoverApi } from "./ui/hover-registry";
import { installStatusApi } from "./ui/status";
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
//   ./ui/hover-panel               -> registerHoverPanel() (hoverToken panel) at module scope
import "./hooks";
import "./combat/tracker";
import "./data/generic-actor";
import "./applications/generic-actor-sheet";
import "./rulesets/orphan-check";
import "./applications/setup-wizard";
import "./ui/hover-panel";

// The namespace, built at MODULE TOP LEVEL -- the dnd5e trick, verbatim in
// spirit (vault/foundry-systems/settings-and-api-namespace-conventions.md):
//
//   globalThis.dnd5e = { ... };                    // module top level
//   Hooks.once("init", () => { globalThis.dnd5e = game.dnd5e =
//     Object.assign(game.system, globalThis.dnd5e); });
//
// Everything a ruleset module needs -- api, measure, dice -- is reachable on
// `globalThis.battleframe` from this line onward, before *any* package's
// `init` hook runs. That is the point: Foundry publishes no package
// load-order contract, so a ruleset that reads the api from its own `init`
// must not depend on this system's `init` having run first. None of these
// installers touch `game`; `game` does not exist yet here.
installBattleframeApi();
installMeasurementApi();
installFacingApi();
installDiceApi();
installAreaApi();
installRoundsApi();
installLosApi();
installHoverApi();
installStatusApi();

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
 * Wires core at `init`. The api is NOT installed here -- it was installed at
 * module top level, above, and a ruleset module may already have registered
 * against it before this hook fired. What happens here is the binding step:
 * `game` finally exists, so the namespace gets attached to it, making
 * `globalThis.battleframe`, `game.battleframe` and `game.system` the same
 * object (see bindBattleframeNamespace). Consumers reading any of the three
 * from their own `init` therefore see the same, already-populated api,
 * whichever package Foundry loaded first.
 *
 * `./hooks` no longer installs the api -- there is one installer now, and it
 * runs at import time.
 */
export function initialiseBattleframe(): void {
  bindBattleframeNamespace();

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

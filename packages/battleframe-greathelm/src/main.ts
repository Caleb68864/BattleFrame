import { MODULE_ID, SETTING_MIN_DICE_POOL_FLOOR_ENABLED } from "./constants";
import { registerKnightDataModel } from "./data/knight";
import { registerKnightSheet } from "./sheets/knight-sheet";
import { registerRoundControl } from "./ui/round-control";

interface FoundrySettingsApi {
  register: (namespace: string, key: string, data: Record<string, unknown>) => void;
}

interface BattleframeRegisterResult {
  ok: boolean;
  errors?: string[];
}

interface BattleframeApi {
  registerRuleset: (def: Record<string, unknown>) => BattleframeRegisterResult;
}

function resolveGame(): {
  settings?: FoundrySettingsApi;
  battleframe?: { api?: BattleframeApi };
} | undefined {
  const globalScope = globalThis as unknown as {
    game?: { settings?: FoundrySettingsApi; battleframe?: { api?: BattleframeApi } };
  };

  return globalScope.game;
}

/**
 * The min-dice-pool-floor setting is Kickstarter-only, not QSR v0.4 -- see
 * constants.ts MIN_DICE_POOL_FLOOR. Defaults off so no house rule is
 * silently applied.
 */
function registerGreathelmSettings(): void {
  const settings = resolveGame()?.settings;
  if (!settings) {
    return;
  }

  settings.register(MODULE_ID, SETTING_MIN_DICE_POOL_FLOOR_ENABLED, {
    name: "battleframe-greathelm.settings.minDicePoolFloorEnabled.name",
    hint: "battleframe-greathelm.settings.minDicePoolFloorEnabled.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
}

/**
 * Registers GREATHELM as the primary ruleset via the battleframe system's
 * public API.
 *
 * The `if (!api)` guard is load-bearing and NOT belt-and-braces. An earlier
 * version of this comment claimed the API "is guaranteed present here"
 * because a system's `init` always precedes a module's. The vault records the
 * opposite: whether "load order guarantees the system's `init` runs before
 * the ruleset module's `init`" is listed, verbatim, as an unsettled question
 * in vault/foundry-systems/the-experiment-that-would-settle-the-critical-question.md
 * -- and core currently installs the API *inside* its own `init` hook
 * (packages/battleframe/src/hooks/index.ts), rather than at module top level,
 * so it does not use the dnd5e load-order trick that would actually make the
 * guarantee true (see settings-and-api-namespace-conventions.md, "The
 * load-order trick is the point"). Nothing has confirmed the ordering in a
 * live world.
 *
 * Known consequence, out of scope for SS-13 and reported rather than fixed
 * here: if the ordering ever does not hold, this returns silently and
 * GREATHELM simply never registers.
 */
function registerGreathelmRuleset(): void {
  const api = resolveGame()?.battleframe?.api;
  if (!api) {
    return;
  }

  api.registerRuleset({
    id: MODULE_ID,
    title: "GREATHELM",
    version: "0.1.0",
    battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
    primary: true,
  });
}

Hooks.once("init", () => {
  // Registers the knight Actor subtype at CONFIG.Actor.dataModels (see
  // ../data/knight.ts registerKnightDataModel).
  registerKnightDataModel();
  registerKnightSheet();
  registerGreathelmSettings();
  registerGreathelmRuleset();
  // The round trigger: a scene control button, registered through Foundry's
  // own getSceneControlButtons hook. This is what makes the round loop
  // reachable by a user -- and it needs nothing from packages/battleframe,
  // which is the point (see ./ui/round-control.ts).
  registerRoundControl();
});

import { MODULE_ID, SETTING_MIN_DICE_POOL_FLOOR_ENABLED } from "./constants";
import { registerKnightDataModel } from "./data/knight";

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
 * public API. `game.battleframe.api` is installed by the system's own
 * `init` hook, which -- since battleframe is the system and this is a
 * module -- always runs before this module's `init` hook fires, so the
 * API is guaranteed present here.
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
  registerGreathelmSettings();
  registerGreathelmRuleset();
});

import {
  KNIGHT_ACTOR_TYPE,
  MODULE_ID,
  SETTING_MIN_DICE_POOL_FLOOR_ENABLED,
  SETTING_PROMPT_ATTACK_TARGET,
  SETTING_PROMPT_FIRST_OR_SECOND,
} from "./constants";
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
 * Resolves the battleframe api without depending on load order.
 *
 * `globalThis.battleframe` is preferred: the system builds that namespace at
 * its module top level (packages/battleframe/src/battleframe.ts), so it
 * exists before *any* package's `init` runs, whichever order Foundry loaded
 * them in -- this is the dnd5e trick, see the system's own comments and
 * vault/foundry-systems/settings-and-api-namespace-conventions.md. The
 * `game.battleframe` fallback covers the bound form, which the system
 * attaches at its `init`; both are the same object once bound.
 */
function resolveBattleframeApi(): BattleframeApi | undefined {
  const globalScope = globalThis as unknown as {
    battleframe?: { api?: BattleframeApi };
  };

  return globalScope.battleframe?.api ?? resolveGame()?.battleframe?.api;
}

/**
 * Resolves the hover stat registry defensively -- it may live on
 * `globalThis.battleframe` (built at the system's module top level) or on the
 * bound `game.battleframe`. Same load-order-independent shape as
 * resolveBattleframeApi.
 */
function hoverRegistry(): { register: (t: string, p: unknown) => void } | undefined {
  const g = globalThis as {
    battleframe?: { hover?: { register: (t: string, p: unknown) => void } };
    game?: { battleframe?: { hover?: { register: (t: string, p: unknown) => void } } };
  };
  return g.battleframe?.hover ?? g.game?.battleframe?.hover;
}

/**
 * Registers the knight hover stat fields with the engine's hover registry.
 * momentum and damage are the only per-knight numbers (see data/knight.ts),
 * both capped at 3, so both render as value/3. Labels are i18n keys the engine
 * localizes at render time. A no-op when the registry is absent.
 */
export function registerGreathelmHoverFields(): void {
  const registry = hoverRegistry();
  if (!registry) {
    return;
  }

  registry.register(`${MODULE_ID}.${KNIGHT_ACTOR_TYPE}`, {
    fields: [
      { key: "momentum", label: `${MODULE_ID}.fields.momentum`, max: 3 },
      { key: "damage", label: `${MODULE_ID}.fields.damage`, max: 3 },
    ],
    defaultVisibility: "everyone",
  });
}

/**
 * Reports a fatal registration failure to the user, then throws. Never
 * returns.
 *
 * Loud failure over plausible output: a ruleset that silently vanishes leaves
 * a world that looks fine and does nothing, with no error, no warning and no
 * trace to debug from. The notification reaches the GM; the throw reaches the
 * console and stops us pretending we registered.
 */
function failRegistration(reason: string): never {
  const message = `${MODULE_ID} | GREATHELM did not register: ${reason}`;

  const notifications = (globalThis as unknown as {
    ui?: { notifications?: { error?: (text: string) => void } };
  }).ui?.notifications;
  notifications?.error?.(message);

  throw new Error(message);
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

  // Both prompts below default ON: asking is the point (QSR p1 gives both
  // choices to a player, not to the engine). See ui/choice-prompts.ts for
  // what happens with each toggle off -- a documented ENGINE DEFAULT, not a
  // rule, and stated in the hint text below so it's a choice, not a surprise.
  settings.register(MODULE_ID, SETTING_PROMPT_FIRST_OR_SECOND, {
    name: "battleframe-greathelm.settings.promptFirstOrSecond.name",
    hint: "battleframe-greathelm.settings.promptFirstOrSecond.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  settings.register(MODULE_ID, SETTING_PROMPT_ATTACK_TARGET, {
    name: "battleframe-greathelm.settings.promptAttackTarget.name",
    hint: "battleframe-greathelm.settings.promptAttackTarget.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
}

/**
 * Registers GREATHELM as the primary ruleset via the battleframe system's
 * public API.
 *
 * There is no silent path out of this function. The api is resolved in a
 * load-order-independent way (resolveBattleframeApi), so a miss no longer
 * means "the system's `init` has not run yet" -- it means the battleframe
 * system is absent, broken, or has changed its namespace convention. Every
 * one of those is a real failure the user has to be told about, and a
 * rejected registration is too: GREATHELM not being the active ruleset is
 * not something to discover from an empty character sheet.
 */
function registerGreathelmRuleset(): void {
  const api = resolveBattleframeApi();
  if (!api) {
    failRegistration(
      "the battleframe system API was not found on globalThis.battleframe or " +
        "game.battleframe. Is the battleframe system installed and active?"
    );
  }

  const result = api.registerRuleset({
    id: MODULE_ID,
    title: "GREATHELM",
    version: "0.1.0",
    battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
    primary: true,
  });

  if (!result.ok) {
    failRegistration(result.errors?.join("; ") ?? "the system rejected the ruleset");
  }
}

const globalHooks = (globalThis as unknown as {
  Hooks?: { once: (event: string, cb: () => void) => void };
}).Hooks;

globalHooks?.once("init", () => {
  // Registers the knight Actor subtype at CONFIG.Actor.dataModels (see
  // ../data/knight.ts registerKnightDataModel).
  registerKnightDataModel();
  registerKnightSheet();
  registerGreathelmSettings();
  // Advertise the knight's hover stat fields to the engine's hover registry.
  registerGreathelmHoverFields();
  // The round trigger: a scene control button, registered through Foundry's
  // own getSceneControlButtons hook. Clicking it rolls initiative and opens
  // the pool panel for the GM to play the round die by die -- it no longer
  // resolves the round itself. This is what makes the player-driven round
  // reachable by a user -- and it needs nothing from packages/battleframe,
  // which is the point (see ./ui/round-control.ts).
  registerRoundControl();
  // Last, deliberately: registerGreathelmRuleset throws on failure rather
  // than returning silently, and everything above it is independent of the
  // system's api. Ordering it here means a missing system produces a loud
  // error without also swallowing the registrations that would have worked.
  registerGreathelmRuleset();
});

import { MODULE_ID, UNIT_ACTOR_TYPE } from "./constants";
import { registerUnitDataModel } from "./data/unit";
import { registerSettings } from "./settings";
import { registerUnitSheet } from "./sheets/unit-sheet";
import { registerStatusEffects } from "./status";
import { registerInCountryTokenDefaults } from "./token-defaults";
import { registerRoundControl, advanceRoundCore } from "./ui/round-control";

interface BattleframeRegisterResult {
  ok: boolean;
  errors?: string[];
}

interface BattleframeApi {
  registerRuleset: (def: Record<string, unknown>) => BattleframeRegisterResult;
}

/**
 * Resolves the battleframe api without depending on package load order (the
 * system builds `globalThis.battleframe` at its module top level). Same pattern
 * as the other rulesets.
 */
function resolveBattleframeApi(): BattleframeApi | undefined {
  const globalScope = globalThis as unknown as {
    battleframe?: { api?: BattleframeApi };
    game?: { battleframe?: { api?: BattleframeApi } };
  };
  return globalScope.battleframe?.api ?? globalScope.game?.battleframe?.api;
}

/** Reports a fatal registration failure to the GM, then throws. Never returns. */
function failRegistration(reason: string): never {
  const message = `${MODULE_ID} | InCountry did not register: ${reason}`;
  const notifications = (globalThis as unknown as {
    ui?: { notifications?: { error?: (text: string) => void } };
  }).ui?.notifications;
  notifications?.error?.(message);
  throw new Error(message);
}

/**
 * Resolves the engine's hover stat registry defensively -- it may live on
 * `globalThis.battleframe` or the bound `game.battleframe`, same shape as the
 * api resolution.
 */
function hoverRegistry(): { register: (t: string, p: unknown) => void } | undefined {
  const g = globalThis as {
    battleframe?: { hover?: { register: (t: string, p: unknown) => void } };
    game?: { battleframe?: { hover?: { register: (t: string, p: unknown) => void } } };
  };
  return g.battleframe?.hover ?? g.game?.battleframe?.hover;
}

/**
 * Registers the unit hover stat fields with the engine's hover registry.
 * `modelsRemaining` is the only hover number -- suppression is a battlefield
 * condition surfaced through the engine's status-icon row (see status.ts), not
 * a stat field. No `max`: a unit's live model count has no fixed ceiling on the
 * card. Label reuses the `battleframe-incountry.fields.modelsRemaining` i18n
 * key. No-op when the registry is absent.
 */
export function registerInCountryHoverFields(): void {
  const registry = hoverRegistry();
  if (!registry) {
    return;
  }

  registry.register(`${MODULE_ID}.${UNIT_ACTOR_TYPE}`, {
    fields: [
      { key: "modelsRemaining", label: `${MODULE_ID}.fields.modelsRemaining` },
    ],
    defaultVisibility: "everyone",
  });
}

/** Registers InCountry as a ruleset via the system's public API. */
export function registerInCountryRuleset(): void {
  const api = resolveBattleframeApi();
  if (!api) {
    failRegistration(
      "the battleframe system API was not found on globalThis.battleframe or " +
        "game.battleframe. Is the battleframe system installed and active?"
    );
  }

  const result = api.registerRuleset({
    id: MODULE_ID,
    title: "InCountry",
    version: "0.1.0",
    battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
    primary: true
  });

  if (!result.ok) {
    failRegistration(result.errors?.join("; ") ?? "the system rejected the ruleset");
  }
}

const globalHooks = (globalThis as unknown as {
  Hooks?: { once: (event: string, cb: () => void) => void };
}).Hooks;

globalHooks?.once("init", () => {
  // First: the world's own rules numbers. This module ships none, so nothing
  // downstream can roll until a world has answered for them.
  registerSettings();
  registerUnitDataModel();
  registerUnitSheet();
  registerStatusEffects();
  // Give fresh unit Actors a shipped default token image (engine token registry).
  registerInCountryTokenDefaults();
  // Advertise the unit's hover stat fields to the engine's hover registry.
  registerInCountryHoverFields();
  // The round trigger: a scene control answering Foundry's own hook. This is
  // what makes the round/combat logic reachable in the shipped bundle -- without
  // it, all of it is tree-shaken out.
  registerRoundControl();
  // Player-driven, GM-less round advance: register what "advance the round" does
  // (roll initiative + open the next round). When all players mark ready, the
  // engine's countdown runs this on the host client. Same wiring as Full Thrust.
  const advance = (globalThis as any).battleframe?.advance ?? (globalThis as any).game?.battleframe?.advance;
  advance?.registerAdvance?.(() => advanceRoundCore());
  registerInCountryRuleset();
});

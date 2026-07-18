import { MODULE_ID } from "./constants";
import { registerUnitDataModel } from "./data/unit";
import { registerUnitSheet } from "./sheets/unit-sheet";
import { registerStatusEffects } from "./status";
import { registerRoundControl } from "./ui/round-control";

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
  registerUnitDataModel();
  registerUnitSheet();
  registerStatusEffects();
  // The round trigger: a scene control answering Foundry's own hook. This is
  // what makes the round/combat logic reachable in the shipped bundle -- without
  // it, all of it is tree-shaken out.
  registerRoundControl();
  registerInCountryRuleset();
});

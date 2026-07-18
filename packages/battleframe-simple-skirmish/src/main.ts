import { MODULE_ID } from "./constants";
import { registerUnitDataModel } from "./data/unit";
import { registerUnitSheet } from "./sheets/unit-sheet";

interface BattleframeRegisterResult {
  ok: boolean;
  errors?: string[];
}

interface BattleframeApi {
  registerRuleset: (def: Record<string, unknown>) => BattleframeRegisterResult;
}

/**
 * Resolves the battleframe api without depending on package load order. The
 * system builds `globalThis.battleframe` at its module top level, so it exists
 * before any package's `init`, whichever order Foundry loaded them in;
 * `game.battleframe` is the same object once bound. See the system's api/index
 * and vault/foundry-systems/settings-and-api-namespace-conventions.md.
 */
function resolveBattleframeApi(): BattleframeApi | undefined {
  const globalScope = globalThis as unknown as {
    battleframe?: { api?: BattleframeApi };
    game?: { battleframe?: { api?: BattleframeApi } };
  };

  return globalScope.battleframe?.api ?? globalScope.game?.battleframe?.api;
}

/**
 * Reports a fatal registration failure to the GM, then throws. Never returns.
 * A ruleset that vanishes silently leaves a world that looks fine and does
 * nothing -- loud failure over plausible output.
 */
function failRegistration(reason: string): never {
  const message = `${MODULE_ID} | Simple Skirmish did not register: ${reason}`;

  const notifications = (globalThis as unknown as {
    ui?: { notifications?: { error?: (text: string) => void } };
  }).ui?.notifications;
  notifications?.error?.(message);

  throw new Error(message);
}

/** Registers Simple Skirmish as the active ruleset via the system's public API. */
export function registerSimpleSkirmishRuleset(): void {
  const api = resolveBattleframeApi();

  if (!api) {
    failRegistration(
      "the battleframe system API was not found on globalThis.battleframe or " +
        "game.battleframe. Is the battleframe system installed and active?"
    );
  }

  const result = api.registerRuleset({
    id: MODULE_ID,
    title: "Simple Skirmish",
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
  registerSimpleSkirmishRuleset();
});

import { MODULE_ID, UNIT_ACTOR_TYPE } from "./constants";
import { registerUnitDataModel } from "./data/unit";
import { registerUnitSheet } from "./sheets/unit-sheet";
import { registerSimpleSkirmishTokenDefaults } from "./token-defaults";
import { registerRoundControl, advanceRoundCore } from "./ui/round-control";

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
 * Registers the unit hover stat fields with the engine's hover registry. The
 * seven Basic Game stats are all target numbers or counts with no ceiling, so
 * none carries a `max`. Labels reuse the existing `battleframe-simple-skirmish
 * .fields.*` i18n keys the engine localizes at render time. No-op when the
 * registry is absent.
 */
export function registerSimpleSkirmishHoverFields(): void {
  const registry = hoverRegistry();
  if (!registry) {
    return;
  }

  registry.register(`${MODULE_ID}.${UNIT_ACTOR_TYPE}`, {
    fields: [
      { key: "models", label: `${MODULE_ID}.fields.models` },
      { key: "move", label: `${MODULE_ID}.fields.move` },
      { key: "attackMelee", label: `${MODULE_ID}.fields.attackMelee` },
      { key: "attackRanged", label: `${MODULE_ID}.fields.attackRanged` },
      { key: "attackMagic", label: `${MODULE_ID}.fields.attackMagic` },
      { key: "save", label: `${MODULE_ID}.fields.save` },
      { key: "skill", label: `${MODULE_ID}.fields.skill` },
    ],
    defaultVisibility: "everyone",
  });
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
  // Give a fresh unit its shipped squad game-icon (via the engine token registry).
  registerSimpleSkirmishTokenDefaults();
  // Advertise the unit's hover stat fields to the engine's hover registry.
  registerSimpleSkirmishHoverFields();
  // The round trigger: a scene control answering Foundry's own hook. This is
  // what makes the combat/round/victory logic reachable in the shipped bundle
  // -- without it, all of it is tree-shaken out (see COVERAGE.md).
  registerRoundControl();
  // Player-driven, GM-less round advance: tell the engine what "advance the round"
  // means for Simple Skirmish (roll initiative and open the next round). Resolved
  // defensively off either namespace, same as the api/hover lookups above.
  const advance =
    (globalThis as any).battleframe?.advance ?? (globalThis as any).game?.battleframe?.advance;
  advance?.registerAdvance?.(() => advanceRoundCore());
  registerSimpleSkirmishRuleset();
});

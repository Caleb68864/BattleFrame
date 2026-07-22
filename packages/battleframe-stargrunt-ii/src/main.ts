import { MODULE_ID, UNIT_ACTOR_TYPE } from "./constants";
import { registerUnitDataModel } from "./data/unit";
import { registerUnitSheet } from "./sheets/unit-sheet";
import { registerStatusEffects } from "./status";
import { registerRoundControl, advanceTurnCore } from "./ui/round-control";

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
  const message = `${MODULE_ID} | Stargrunt II did not register: ${reason}`;
  const notifications = (globalThis as unknown as {
    ui?: { notifications?: { error?: (text: string) => void } };
  }).ui?.notifications;
  notifications?.error?.(message);
  throw new Error(message);
}

/** The engine's hover stat registry, resolved defensively. */
function hoverRegistry(): { register: (t: string, p: unknown) => void } | undefined {
  const g = globalThis as {
    battleframe?: { hover?: { register: (t: string, p: unknown) => void } };
    game?: { battleframe?: { hover?: { register: (t: string, p: unknown) => void } } };
  };
  return g.battleframe?.hover ?? g.game?.battleframe?.hover;
}

/**
 * Advertises the unit's at-a-glance stats to the engine's hover panel: Quality
 * (the die that drives everything), plus the two live morale counters —
 * confidence (0..4 ladder) and suppression (0..3). These are the numbers a
 * commander reads off a squad without opening its sheet. No-op without the
 * registry.
 */
export function registerStargruntHoverFields(): void {
  const registry = hoverRegistry();
  if (!registry) {
    return;
  }
  registry.register(`${MODULE_ID}.${UNIT_ACTOR_TYPE}`, {
    fields: [
      { key: "quality", label: `${MODULE_ID}.fields.quality` },
      { key: "confidence", label: `${MODULE_ID}.fields.confidence`, max: 4 },
      { key: "suppression", label: `${MODULE_ID}.fields.suppression`, max: 3 }
    ],
    defaultVisibility: "everyone"
  });
}

/** Registers Stargrunt II as the active ruleset via the system's public API. */
export function registerStargruntRuleset(): void {
  const api = resolveBattleframeApi();
  if (!api) {
    failRegistration(
      "the battleframe system API was not found on globalThis.battleframe or " +
        "game.battleframe. Is the battleframe system installed and active?"
    );
  }

  const result = api.registerRuleset({
    id: MODULE_ID,
    title: "Stargrunt II",
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
  registerStargruntHoverFields();
  // The reachable trigger: a scene control answering Foundry's own hook. Without
  // it the session/fire code is tree-shaken out of the bundle.
  registerRoundControl();
  // Player-driven, GM-less turn advance: register what "advance the turn" does
  // (the SG2 Turn-End Phase). When all players ready, the engine countdown runs
  // this on the host client. Same wiring as InCountry / Full Thrust.
  const advance = (globalThis as any).battleframe?.advance ?? (globalThis as any).game?.battleframe?.advance;
  advance?.registerAdvance?.(() => advanceTurnCore());
  registerStargruntRuleset();
});

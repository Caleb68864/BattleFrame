import { MODULE_ID, VEHICLE_ACTOR_TYPE, UNIT_ACTOR_TYPE } from "./constants";
import { registerDataModels } from "./data/register";
import { registerSheets } from "./sheets/register";
import { registerStatusEffects } from "./status";
import { registerDirtsideTokenDefaults } from "./token-defaults";
import { registerRoundControl, advanceTurnCore } from "./ui/round-control";
import { registerCommandLossHook } from "./round/command-loss";

/**
 * Module entry (the Vite bundle root). Init order per build plan §4 G10:
 * data models → sheets → status effects → hover fields → round control →
 * advance callback → command-loss hook → ruleset registration (LAST + loud).
 *
 * The engine API is resolved defensively (`globalThis.battleframe ??
 * game.battleframe`) since Foundry publishes no package load-order contract.
 */

interface RegisterResult {
  ok: boolean;
  errors?: string[];
}
interface BattleframeApi {
  registerRuleset: (def: Record<string, unknown>) => RegisterResult;
}

function resolveBattleframeApi(): BattleframeApi | undefined {
  const g = globalThis as unknown as {
    battleframe?: { api?: BattleframeApi };
    game?: { battleframe?: { api?: BattleframeApi } };
  };
  return g.battleframe?.api ?? g.game?.battleframe?.api;
}

function hoverRegistry(): { register: (t: string, p: unknown) => void } | undefined {
  const g = globalThis as {
    battleframe?: { hover?: { register: (t: string, p: unknown) => void } };
    game?: { battleframe?: { hover?: { register: (t: string, p: unknown) => void } } };
  };
  return g.battleframe?.hover ?? g.game?.battleframe?.hover;
}

function failRegistration(reason: string): never {
  const message = `${MODULE_ID} | Dirtside II did not register: ${reason}`;
  const notifications = (globalThis as unknown as {
    ui?: { notifications?: { error?: (t: string) => void } };
  }).ui?.notifications;
  notifications?.error?.(message);
  throw new Error(message);
}

/** Advertises at-a-glance stats to the engine's hover panel. No-op without the registry. */
export function registerDirtsideHoverFields(): void {
  const registry = hoverRegistry();
  if (!registry) {
    return;
  }
  registry.register(`${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`, {
    fields: [
      { key: "sizeClass", label: `${MODULE_ID}.fields.size` },
      { key: "armour.front", label: `${MODULE_ID}.fields.armour` },
    ],
    defaultVisibility: "everyone",
  });
  registry.register(`${MODULE_ID}.${UNIT_ACTOR_TYPE}`, {
    fields: [{ key: "leadership", label: `${MODULE_ID}.fields.leadership` }],
    defaultVisibility: "everyone",
  });
}

/** Registers Dirtside II as the active ruleset via the system's public API. */
export function registerDirtsideRuleset(): void {
  const api = resolveBattleframeApi();
  if (!api) {
    failRegistration(
      "the battleframe system API was not found on globalThis.battleframe or " +
        "game.battleframe. Is the battleframe system installed and active?"
    );
  }
  const result = api.registerRuleset({
    id: MODULE_ID,
    title: "Dirtside II",
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
  registerDataModels(); // G1
  registerSheets(); // G2
  registerStatusEffects(); // G8
  // Give fresh vehicle/infantry Actors a shipped default token image (engine token registry).
  registerDirtsideTokenDefaults();
  registerDirtsideHoverFields();
  registerRoundControl(); // G3 — the reachable trigger; without it the fire/round code is tree-shaken
  // G4 — player-driven, GM-less Turn End: register what "advance" does.
  const advance = (globalThis as any).battleframe?.advance ?? (globalThis as any).game?.battleframe?.advance;
  advance?.registerAdvance?.(() => advanceTurnCore());
  registerCommandLossHook(); // G9
  registerDirtsideRuleset(); // LAST + loud
});

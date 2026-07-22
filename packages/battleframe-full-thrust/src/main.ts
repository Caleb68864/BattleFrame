import { MODULE_ID, SHIP_ACTOR_TYPE, FIGHTER_GROUP_ACTOR_TYPE, FIGHTER_GROUP_MAX } from "./constants";
import { registerShipDataModel } from "./data/ship";
import { registerFighterGroupDataModel } from "./data/fighter-group";
import { registerShipSheet } from "./sheets/ship-sheet";
import { registerFighterSheet } from "./sheets/fighter-sheet";
import { registerRoundControl } from "./ui/round-control";

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
  const message = `${MODULE_ID} | Full Thrust did not register: ${reason}`;

  const notifications = (globalThis as unknown as {
    ui?: { notifications?: { error?: (text: string) => void } };
  }).ui?.notifications;
  notifications?.error?.(message);

  throw new Error(message);
}

/**
 * Resolves the engine's hover stat registry defensively -- it may live on
 * `globalThis.battleframe` or the bound `game.battleframe`.
 */
function hoverRegistry(): { register: (t: string, p: unknown) => void } | undefined {
  const g = globalThis as {
    battleframe?: { hover?: { register: (t: string, p: unknown) => void } };
    game?: { battleframe?: { hover?: { register: (t: string, p: unknown) => void } } };
  };
  return g.battleframe?.hover ?? g.game?.battleframe?.hover;
}

/**
 * Advertises the ship's at-a-glance stats to the engine's hover panel. The
 * movement state (velocity + course) and passive defences are the values a
 * commander reads off an enemy hull without opening its sheet.
 */
export function registerFullThrustHoverFields(): void {
  const registry = hoverRegistry();
  if (!registry) {
    return;
  }

  registry.register(`${MODULE_ID}.${SHIP_ACTOR_TYPE}`, {
    fields: [
      { key: "thrust", label: `${MODULE_ID}.fields.thrust` },
      { key: "velocity", label: `${MODULE_ID}.fields.velocity` },
      { key: "course", label: `${MODULE_ID}.fields.course` },
      { key: "screens", label: `${MODULE_ID}.fields.screens` },
      { key: "fcs", label: `${MODULE_ID}.fields.fcs` }
    ],
    defaultVisibility: "everyone"
  });

  registry.register(`${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`, {
    fields: [{ key: "size", label: `${MODULE_ID}.fields.size`, max: FIGHTER_GROUP_MAX }],
    defaultVisibility: "everyone"
  });
}

/** Registers Full Thrust as the active ruleset via the system's public API. */
export function registerFullThrustRuleset(): void {
  const api = resolveBattleframeApi();

  if (!api) {
    failRegistration(
      "the battleframe system API was not found on globalThis.battleframe or " +
        "game.battleframe. Is the battleframe system installed and active?"
    );
  }

  const result = api.registerRuleset({
    id: MODULE_ID,
    title: "Full Thrust",
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
  registerShipDataModel();
  registerFighterGroupDataModel();
  registerShipSheet();
  registerFighterSheet();
  registerFullThrustHoverFields();
  // The reachable trigger: a scene control answering Foundry's own hook. Without
  // it the fire/movement code is tree-shaken out (see COVERAGE.md).
  registerRoundControl();
  registerFullThrustRuleset();
});

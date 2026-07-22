import { MODULE_ID } from "./constants";

/**
 * InCountry battlefield conditions as Foundry status effects. Registering them
 * on `CONFIG.statusEffects` makes them show as an icon on the token, sync to
 * every client, and persist on the document -- instead of an invisible `system`
 * boolean nobody at the table can see (roadmap P1). Numeric counters
 * (modelsRemaining etc.) stay `NumberField`s; only the boolean condition goes
 * native.
 */

export const SUPPRESSED_STATUS = `${MODULE_ID}-suppressed`;

interface StatusEffectConfig {
  id: string;
  name: string;
  img: string;
}

/** The status effects this ruleset contributes. */
export function inCountryStatusEffects(): StatusEffectConfig[] {
  return [
    {
      id: SUPPRESSED_STATUS,
      name: `${MODULE_ID}.status.suppressed`,
      // A core Foundry SVG -- the module ships no artwork.
      img: "icons/svg/downgrade.svg"
    }
  ];
}

/** The engine's status registry (game.battleframe.status), resolved defensively. */
function statusApi(): { register: (e: StatusEffectConfig) => void } | undefined {
  const scope = globalThis as {
    battleframe?: { status?: { register: (e: StatusEffectConfig) => void } };
    game?: { battleframe?: { status?: { register: (e: StatusEffectConfig) => void } } };
  };
  return scope.battleframe?.status ?? scope.game?.battleframe?.status;
}

/** Registers InCountry's conditions via the engine's status registry at init. Idempotent. */
export function registerStatusEffects(): void {
  const registry = statusApi();
  if (!registry) {
    return;
  }
  for (const effect of inCountryStatusEffects()) {
    registry.register(effect);
  }
}

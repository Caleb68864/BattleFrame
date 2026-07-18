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

/** Adds InCountry's conditions to `CONFIG.statusEffects` at init. Idempotent. */
export function registerStatusEffects(): void {
  const config = (globalThis as unknown as { CONFIG?: { statusEffects?: StatusEffectConfig[] } }).CONFIG;
  if (!config || !Array.isArray(config.statusEffects)) {
    return;
  }
  for (const effect of inCountryStatusEffects()) {
    if (!config.statusEffects.some((existing) => existing.id === effect.id)) {
      config.statusEffects.push(effect);
    }
  }
}

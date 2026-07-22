/**
 * Battlefield conditions surfaced as Foundry-native status effects so they show
 * on the token, sync to every client, and persist -- per the project's
 * "battlefield condition -> CONFIG.statusEffects" rule. A ship is:
 *  - CRIPPLED once its drives are dead (thrust 0): it can no longer manoeuvre.
 *  - WEAPONS OFFLINE once all fire control is gone (fcs 0): it cannot fire.
 * Destruction stays the engine's native `defeated` (handled in data/ship-state).
 */

import { MODULE_ID } from "./constants";
import { usableThrust, remainingFcs, type ShipSystemLike } from "./ship/systems";

export const CRIPPLED_STATUS = `${MODULE_ID}-crippled`;
export const WEAPONS_OFFLINE_STATUS = `${MODULE_ID}-weapons-offline`;

interface StatusEffect {
  id: string;
  name: string;
  img: string;
}

/** Registers the ship condition status effects onto CONFIG.statusEffects (idempotent). */
export function registerShipStatusEffects(): void {
  const config = (globalThis as unknown as {
    CONFIG?: { statusEffects?: StatusEffect[] };
  }).CONFIG;
  if (!config) {
    return;
  }
  config.statusEffects = config.statusEffects ?? [];

  const add = (effect: StatusEffect): void => {
    if (!config.statusEffects!.some((s) => s.id === effect.id)) {
      config.statusEffects!.push(effect);
    }
  };

  add({ id: CRIPPLED_STATUS, name: "battleframe-full-thrust.status.crippled", img: "icons/svg/downgrade.svg" });
  add({ id: WEAPONS_OFFLINE_STATUS, name: "battleframe-full-thrust.status.weaponsOffline", img: "icons/svg/explosion.svg" });
}

export interface StatusShipLike {
  system?: ShipSystemLike;
  toggleStatusEffect: (id: string, options: { active: boolean }) => Promise<unknown>;
}

/**
 * Toggles a ship's condition statuses to match its remaining systems: crippled
 * when the drives push no thrust, weapons-offline when no fire control remains.
 * Called after damage/threshold resolution, so the token reflects the real state.
 */
export async function syncShipStatuses(actor: StatusShipLike): Promise<void> {
  const system = actor.system ?? {};
  await actor.toggleStatusEffect(CRIPPLED_STATUS, { active: usableThrust(system) <= 0 });
  await actor.toggleStatusEffect(WEAPONS_OFFLINE_STATUS, { active: remainingFcs(system) < 1 });
}

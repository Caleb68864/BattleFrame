/**
 * Live ship state: reading the hull/armour off a ship Actor, applying damage
 * back to it, and surfacing destruction as Foundry's native `defeated` status
 * so the skull shows on the token and syncs to every client (per the project's
 * "battlefield condition -> status effect" rule). The damage arithmetic itself
 * is the pure ../ship/damage; this module is the Foundry I/O around it.
 */

import { applyDamageWithArmour, type ApplyDamageWithArmourResult } from "../ship/damage";

export interface ShipActorLike {
  system?: Record<string, any>;
  update: (data: Record<string, unknown>) => Promise<unknown>;
  toggleStatusEffect: (id: string, options: { active: boolean }) => Promise<unknown>;
}

interface ArmourSystem {
  boxes?: number;
  damage?: number;
}
interface HullSystem {
  boxes?: number;
  damage?: number;
  rows?: number;
}

function armourOf(actor: ShipActorLike): { boxes: number; damage: number } {
  const a = (actor.system?.armour ?? {}) as ArmourSystem;
  return { boxes: a.boxes ?? 0, damage: a.damage ?? 0 };
}

function hullOf(actor: ShipActorLike): { boxes: number; damage: number; rows: number } {
  const h = (actor.system?.hull ?? {}) as HullSystem;
  return { boxes: h.boxes ?? 1, damage: h.damage ?? 0, rows: h.rows ?? 1 };
}

/** True once every hull box is crossed off -- the ship is removed from play. */
export function isShipDestroyed(actor: ShipActorLike): boolean {
  const hull = hullOf(actor);
  return hull.damage >= hull.boxes;
}

/** The id Foundry uses for the defeated/dead status, defaulting to "dead". */
function defeatedStatusId(): string {
  const config = (globalThis as unknown as {
    CONFIG?: { specialStatusEffects?: { DEFEATED?: string } };
  }).CONFIG;
  return config?.specialStatusEffects?.DEFEATED ?? "dead";
}

/**
 * Applies `points` of damage to a ship: armour first, then hull, persisting the
 * new armour/hull damage to the actor and toggling the native defeated status
 * to match destruction. Returns the full damage result -- including which
 * thresholds were crossed -- so the caller can run the threshold check.
 */
export async function applyDamageToShip(
  actor: ShipActorLike,
  points: number
): Promise<ApplyDamageWithArmourResult> {
  const armour = armourOf(actor);
  const hull = hullOf(actor);

  const result = applyDamageWithArmour({
    armour,
    hull,
    incoming: points
  });

  await actor.update({
    "system.armour.damage": result.armour.damage,
    "system.hull.damage": result.hull.damage
  });

  await actor.toggleStatusEffect(defeatedStatusId(), { active: result.destroyed });

  return result;
}

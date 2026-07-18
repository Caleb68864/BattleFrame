/**
 * Reading and mutating a unit's live model count. A unit's models are both the
 * dice it throws and the thing casualties remove, so this is the one place that
 * count is read and written -- persisted to the Actor document (via `update`)
 * so losses survive a reload, the same reason GREATHELM writes wounds to the
 * document rather than to round state.
 */
export interface UnitActorLike {
  system?: { models?: number };
  update: (data: Record<string, unknown>) => Promise<unknown>;
  /** Foundry's native status toggler -- present on real Actors, optional for tests/plain objects. */
  toggleStatusEffect?: (id: string, options?: { active?: boolean }) => Promise<unknown>;
}

export function unitModels(actor: UnitActorLike): number {
  return actor.system?.models ?? 0;
}

/** A unit with no models left is destroyed and off the table (Basic Game deathmatch). */
export function isUnitDestroyed(actor: UnitActorLike): boolean {
  return unitModels(actor) <= 0;
}

/** Foundry's core "defeated" status id (the skull overlay), or its documented `"dead"` fallback. */
function defeatedStatusId(): string {
  const config = (globalThis as unknown as {
    CONFIG?: { specialStatusEffects?: { DEFEATED?: string } };
  }).CONFIG;
  return config?.specialStatusEffects?.DEFEATED ?? "dead";
}

/**
 * Surfaces destruction on the token via Foundry's native "defeated" status, so
 * a wiped unit is visibly out -- an icon that syncs to every client and persists
 * on the document -- instead of only a `models: 0` number nobody at the table
 * can see (roadmap P1). The count stays a `NumberField`; only the threshold
 * condition (`isUnitDestroyed`) goes native. Idempotent, and a no-op on an actor
 * with no `toggleStatusEffect` (tests, plain objects).
 */
export async function syncDefeatedStatus(actor: UnitActorLike): Promise<void> {
  await actor.toggleStatusEffect?.(defeatedStatusId(), { active: isUnitDestroyed(actor) });
}

/**
 * Removes `casualties` models from the unit, never below zero. Idempotent on
 * zero: no casualties means no database write (a unit that took no losses this
 * attack should not touch its document).
 */
export async function applyCasualties(actor: UnitActorLike, casualties: number): Promise<void> {
  if (casualties <= 0) {
    return;
  }

  const next = Math.max(0, unitModels(actor) - casualties);
  await actor.update({ "system.models": next });
  // The write that empties a unit is exactly when it becomes visibly defeated.
  await syncDefeatedStatus(actor);
}

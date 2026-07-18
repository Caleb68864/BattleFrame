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
}

export function unitModels(actor: UnitActorLike): number {
  return actor.system?.models ?? 0;
}

/** A unit with no models left is destroyed and off the table (Basic Game deathmatch). */
export function isUnitDestroyed(actor: UnitActorLike): boolean {
  return unitModels(actor) <= 0;
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
}

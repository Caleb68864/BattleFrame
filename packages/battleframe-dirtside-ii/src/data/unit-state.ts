import { MODULE_ID, UNIT_ID_FLAG } from "../constants";

/**
 * Pure readers over the token-less `unit` grouping actor (G1). The join to its
 * elements is the `unitId` flag each element carries — the SINGLE source of
 * truth (the unit does NOT store an element list, to avoid two-way sync; build
 * plan §3).
 */

export interface ElementActorLike {
  id: string;
  /** Foundry actors expose `getFlag(scope, key)`. */
  getFlag?(scope: string, key: string): unknown;
  /** Fallback for plain objects / tests: the raw flags bag. */
  flags?: Record<string, Record<string, unknown> | undefined>;
}

/** Reads an element's `unitId` flag, via `getFlag` if available, else the bag. */
function unitIdOf(actor: ElementActorLike): unknown {
  if (typeof actor.getFlag === "function") {
    return actor.getFlag(MODULE_ID, UNIT_ID_FLAG);
  }
  return actor.flags?.[MODULE_ID]?.[UNIT_ID_FLAG];
}

/**
 * The elements belonging to `unitId`: every actor whose `unitId` flag matches.
 * Pass `game.actors` (or its contents) as `actors`; kept as an injected list so
 * the reader is testable without Foundry.
 */
export function elementsOf<T extends ElementActorLike>(
  unitId: string,
  actors: readonly T[]
): T[] {
  return actors.filter((actor) => unitIdOf(actor) === unitId);
}

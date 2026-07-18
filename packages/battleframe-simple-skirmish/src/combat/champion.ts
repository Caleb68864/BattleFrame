import { BASIC_DIE_SIZE } from "../constants";

/**
 * Champions (QSR "Champions"). A champion can wield magical items rolled with a
 * larger die -- d8, d10 or d12 -- and is resolved separately from the unit it
 * may be attached to. The larger die is the whole mechanical difference: the
 * hit/save target logic is unchanged, so a champion attack is just
 * `resolveAttack` with `dieSize` set (see combat/resolve.ts).
 *
 * The rest of the Champion rules -- attach/detach from a unit, casualties taken
 * from the unit first, the champion re-rolling its own save if the unit is
 * wiped -- are Advanced-Game orchestration deferred with that tier; this module
 * owns only the die.
 */
export type ChampionDie = 8 | 10 | 12;

export const CHAMPION_DICE: readonly ChampionDie[] = [8, 10, 12];

/**
 * The die faces a champion rolls: the item's die if it has one, otherwise the
 * basic d6 (a champion with no magical item fights like a model).
 */
export function championDieSize(itemDie: ChampionDie | null | undefined): number {
  return itemDie ?? BASIC_DIE_SIZE;
}

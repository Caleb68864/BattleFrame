/**
 * Pure array operations behind the ship sheet's add/remove-weapon buttons, so
 * the list edits are testable without a live sheet. The sheet's action handlers
 * call these and persist the result via actor.update.
 */

export interface WeaponMountData {
  kind: string;
  weaponClass?: number | null;
  arcs: string[];
  destroyed: boolean;
  spent: boolean;
}

/** A fresh weapon mount: a Class-1 beam with no arcs, undamaged and unspent. */
export function defaultWeapon(): WeaponMountData {
  return { kind: "beam", weaponClass: 1, arcs: [], destroyed: false, spent: false };
}

/** The weapons list with a default weapon appended (input not mutated). */
export function addWeaponTo(weapons: readonly WeaponMountData[] | undefined): WeaponMountData[] {
  return [...(weapons ?? []), defaultWeapon()];
}

/** The weapons list with the entry at `index` removed (input not mutated). */
export function removeWeaponAt(
  weapons: readonly WeaponMountData[] | undefined,
  index: number
): WeaponMountData[] {
  const list = [...(weapons ?? [])];
  if (index >= 0 && index < list.length) {
    list.splice(index, 1);
  }
  return list;
}

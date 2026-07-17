import { SYSTEM_ID } from "../constants";
import type { CombatLike, CombatantLike } from "./types";

export class MissingCombatBaseError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | no global Combat class found; cannot build BattleframeCombat`
    );
    this.name = "MissingCombatBaseError";
  }
}

export type CombatBaseConstructor = new (...args: any[]) => object;

function resolveCombatBase(): CombatBaseConstructor {
  const globalScope = globalThis as unknown as {
    Combat?: CombatBaseConstructor;
  };

  if (!globalScope.Combat) {
    throw new MissingCombatBaseError();
  }

  return globalScope.Combat;
}

/**
 * Reads the activation order for a combat. Core only ever reads this
 * flag -- writing it is a ruleset's job, not core's. See
 * vault/foundry-systems/lancer-activation-based-combat-precedent.md.
 */
export function getOrder(combat: CombatLike): string[] {
  return combat.flags?.battleframe?.order ?? [];
}

/**
 * Resolves the order flag against the combat's actual combatants. Ids in
 * the flag that no longer resolve to a combatant are dropped; combatants
 * absent from the flag are simply not rendered -- core does not invent
 * an order for them. Re-derived from the flag on every call, so a
 * mid-round flag change is reflected immediately.
 */
export function orderedCombatants(combat: CombatLike): CombatantLike[] {
  const order = getOrder(combat);
  const byId = new Map(
    combat.combatants.map((combatant) => [combatant.id, combatant])
  );

  return order
    .map((id) => byId.get(id))
    .filter((combatant): combatant is CombatantLike => combatant !== undefined);
}

/**
 * Builds the BattleframeCombat class against whatever Combat base is
 * available at call time (the real Foundry global, or an injected fake
 * for tests). Battleframe has no initiative model, so `setInitiative` is
 * neutered here -- nothing, core included, writes a number to
 * `initiative`. A ruleset that wants per-unit ordering writes its own
 * flag; it does not resurrect this method.
 */
export function createBattleframeCombatClass(
  CombatBase: CombatBaseConstructor = resolveCombatBase()
): CombatBaseConstructor {
  return class BattleframeCombat extends (CombatBase as new (
    ...args: any[]
  ) => any) {
    setInitiative(): Promise<void> {
      return Promise.resolve();
    }

    getBattleframeOrder(): string[] {
      return getOrder(this as unknown as CombatLike);
    }
  };
}

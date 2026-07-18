/**
 * Reactions (rulebook E) -- the headline mechanic.
 *
 * A unit banks a **Reaction token** by taking no action on its activation. It
 * may then react, but only with a weapon that has an overwatch/react profile.
 * There are two triggers:
 *   - **Overwatch** -- an enemy moves into the reactor's line of sight. The
 *     reactor attacks with its react profile and the target gets no cover. This
 *     is a plain attack with cover forced off, so it needs no special ordering
 *     logic here; the caller resolves it via `resolveAttack` with the clear
 *     Attack Value.
 *   - **Counterattack** -- an enemy makes an attack action in the reactor's line
 *     of sight. The attacker and every counter-attacker roll SIMULTANEOUSLY;
 *     shots then resolve highest hit-total first, and any shooter destroyed by a
 *     strictly higher roll has its own shot discarded. That ordering is the one
 *     piece of real logic, captured below.
 *
 * Declaring a reaction swaps the Reaction token for an **Engaged token**; an
 * engaged model can neither move nor act for the rest of the round. That state
 * transition is the round session's job, not this pure module's.
 */

/** A unit may react only with a reaction token AND a react-capable weapon. */
export function canReact(hasReactionToken: boolean, hasReactWeapon: boolean): boolean {
  return hasReactionToken && hasReactWeapon;
}

export interface CounterShot {
  shooterId: string;
  /** This shot's hit total (sum of hitting faces); higher resolves first. */
  attackTotal: number;
  /** Who this shot is against. */
  targetId: string;
  /** Whether this shot destroys its target (armor already accounted for). */
  destroysTarget: boolean;
}

export interface CounterattackOutcome {
  /** Shots that fired, in resolution order (highest total first). */
  resolved: CounterShot[];
  /** Shots discarded because their shooter died to a strictly higher roll. */
  discarded: CounterShot[];
}

/**
 * Resolves a simultaneous counterattack. Shots are grouped by hit total and
 * processed from the highest group down. A shooter already destroyed by a
 * higher group is discarded; every surviving shot in a group resolves together,
 * so two shooters on the same total who kill each other BOTH land (equal is not
 * "strictly higher").
 */
export function resolveCounterattack(shots: readonly CounterShot[]): CounterattackOutcome {
  const totalsDescending = [...new Set(shots.map((s) => s.attackTotal))].sort((a, b) => b - a);
  const destroyed = new Set<string>();
  const resolved: CounterShot[] = [];
  const discarded: CounterShot[] = [];

  for (const total of totalsDescending) {
    const group = shots.filter((s) => s.attackTotal === total);
    const active = group.filter((s) => !destroyed.has(s.shooterId));

    for (const s of group) {
      if (destroyed.has(s.shooterId)) {
        discarded.push(s);
      }
    }
    resolved.push(...active);

    // Apply this group's kills only after the whole group has fired, so
    // same-total mutual kills both count.
    for (const s of active) {
      if (s.destroysTarget) {
        destroyed.add(s.targetId);
      }
    }
  }

  return { resolved, discarded };
}

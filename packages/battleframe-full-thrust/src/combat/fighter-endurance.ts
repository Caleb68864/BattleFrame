/**
 * The per-turn endurance sweep: what the carrier core's `mustReturn` / `isLost`
 * predicates become once something calls them. Run at the end of each turn over the
 * scene's fighter groups.
 *
 * An exhausted group is told to head home and its dry turns are counted on an Actor
 * flag, so the count survives a reload and syncs. Being LOST is the optional More
 * Thrust variant (see `isLost`), so the caller opts in; without it a group drifts
 * until it is recovered. A lost group goes to size zero and takes Foundry's native
 * defeated status, the same threshold pattern the ships use.
 *
 * The orchestrator has no way to return a group's bay to its carrier: the launch
 * flag lives on the carrier and a group does not record which carrier launched it.
 * A lost group's bay therefore stays occupied until the GM corrects it.
 */

import { FIGHTER_EXHAUSTED_TURNS_FLAG, MODULE_ID } from "../constants";
import { isLost, mustReturn } from "./carrier";

export interface EnduranceGroupActor {
  name?: string;
  /** Foundry's ownership answer. `false` means this client cannot write the actor. */
  isOwner?: boolean;
  system?: { size?: number; endurance?: number };
  getFlag: (scope: string, key: string) => unknown;
  setFlag: (scope: string, key: string, value: unknown) => Promise<unknown>;
  unsetFlag: (scope: string, key: string) => Promise<unknown>;
  update: (data: Record<string, unknown>) => Promise<unknown>;
  toggleStatusEffect: (id: string, options: { active: boolean }) => Promise<unknown>;
}

export interface EnduranceSweepResult {
  name: string;
  status: "must-return" | "lost";
  /** Turns the group has now spent with no fuel. */
  turns: number;
}

function defeatedStatusId(): string {
  const config = (globalThis as { CONFIG?: { specialStatusEffects?: { DEFEATED?: string } } }).CONFIG;
  return config?.specialStatusEffects?.DEFEATED ?? "dead";
}

/**
 * Sweeps the groups, writing the turn count and any loss, and returns what the table
 * needs to be told. A group this client may not write is skipped rather than allowed
 * to throw, because a player's Ready can be what advances the turn.
 */
export async function sweepFighterEndurance(
  groups: readonly EnduranceGroupActor[],
  options: { lossRule: boolean }
): Promise<EnduranceSweepResult[]> {
  const results: EnduranceSweepResult[] = [];

  for (const group of groups) {
    if (group.isOwner === false || (group.system?.size ?? 0) <= 0) {
      continue;
    }

    const previous = Number(group.getFlag(MODULE_ID, FIGHTER_EXHAUSTED_TURNS_FLAG) ?? 0);
    if (!mustReturn({ endurance: group.system?.endurance ?? 0 })) {
      if (previous > 0) {
        await group.unsetFlag(MODULE_ID, FIGHTER_EXHAUSTED_TURNS_FLAG);
      }
      continue;
    }

    const turns = previous + 1;
    await group.setFlag(MODULE_ID, FIGHTER_EXHAUSTED_TURNS_FLAG, turns);

    const name = group.name ?? "Fighter group";
    if (options.lossRule && isLost(turns)) {
      await group.update({ "system.size": 0 });
      await group.toggleStatusEffect(defeatedStatusId(), { active: true });
      results.push({ name, status: "lost", turns });
    } else {
      results.push({ name, status: "must-return", turns });
    }
  }

  return results;
}

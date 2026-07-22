import { MODULE_ID } from "./constants";

/**
 * Stargrunt II battlefield conditions as Foundry status effects. Registering them
 * on `CONFIG.statusEffects` (via the engine's idempotent `status.register`) makes
 * each show as a token icon that syncs to every client and persists on the
 * document — instead of an invisible `system` boolean nobody at the table can see.
 *
 * The numeric counters stay `NumberField`s and are the TRUTH; the status icon is
 * the surfaced VIEW. `syncUnitStatuses` is the Simple-Skirmish `syncDefeatedStatus`
 * pattern: read the data, toggle the icon to match. Suppression's 0..3 COUNT and
 * confidence's 0..4 rung are surfaced as hover badges (see main.ts), not as three
 * separate icons — one `suppressed` icon whose presence means "count > 0".
 */

export const SUPPRESSED_STATUS = `${MODULE_ID}-suppressed`;
export const IN_POSITION_STATUS = `${MODULE_ID}-in-position`;
export const DISORGANISED_STATUS = `${MODULE_ID}-disorganised`;

export interface StatusEffectConfig {
  id: string;
  name: string;
  img: string;
}

/** The status effects this ruleset contributes (core Foundry SVGs — no artwork). */
export function stargruntStatusEffects(): StatusEffectConfig[] {
  return [
    { id: SUPPRESSED_STATUS, name: `${MODULE_ID}.status.suppressed`, img: "icons/svg/downgrade.svg" },
    { id: IN_POSITION_STATUS, name: `${MODULE_ID}.status.inPosition`, img: "icons/svg/target.svg" },
    { id: DISORGANISED_STATUS, name: `${MODULE_ID}.status.disorganised`, img: "icons/svg/daze.svg" }
  ];
}

/** The engine's status registry (game.battleframe.status), resolved defensively. */
function statusApi(): { register: (e: StatusEffectConfig) => void } | undefined {
  const scope = globalThis as {
    battleframe?: { status?: { register: (e: StatusEffectConfig) => void } };
    game?: { battleframe?: { status?: { register: (e: StatusEffectConfig) => void } } };
  };
  return scope.battleframe?.status ?? scope.game?.battleframe?.status;
}

/** Registers SG2's conditions via the engine's status registry at init. Idempotent. */
export function registerStatusEffects(): void {
  const registry = statusApi();
  if (!registry) {
    return;
  }
  for (const effect of stargruntStatusEffects()) {
    registry.register(effect);
  }
}

interface UnitStatusData {
  suppression?: number;
  inPosition?: boolean;
  disorganised?: boolean;
  figures?: { status?: string }[];
}

interface StatusTogglableActor {
  system?: UnitStatusData;
  toggleStatusEffect?: (id: string, opts?: { active?: boolean }) => Promise<unknown>;
}

/** True once every figure on the roster is dead (the unit is wiped). */
export function isUnitWiped(system: UnitStatusData | undefined): boolean {
  const figures = system?.figures ?? [];
  return figures.length > 0 && figures.every((f) => f.status === "dead");
}

/**
 * Toggles every SG2 condition icon to match the unit's data — the data field is
 * the truth, the icon is the view. Includes the core `defeated` skull when the
 * unit is wiped. No-op when the actor cannot toggle status effects (unit tests).
 */
export async function syncUnitStatuses(actor: StatusTogglableActor): Promise<void> {
  const system = actor.system;
  if (!actor.toggleStatusEffect) {
    return;
  }
  const defeated =
    (globalThis as unknown as { CONFIG?: { specialStatusEffects?: { DEFEATED?: string } } }).CONFIG
      ?.specialStatusEffects?.DEFEATED ?? "dead";

  await actor.toggleStatusEffect(SUPPRESSED_STATUS, { active: (system?.suppression ?? 0) > 0 });
  await actor.toggleStatusEffect(IN_POSITION_STATUS, { active: system?.inPosition === true });
  await actor.toggleStatusEffect(DISORGANISED_STATUS, { active: system?.disorganised === true });
  await actor.toggleStatusEffect(defeated, { active: isUnitWiped(system) });
}

import { MODULE_ID } from "./constants";

/**
 * G8 — Dirtside II battlefield conditions as Foundry status effects. The data
 * FIELD is the truth (a vehicle's `damage` marker, a unit's `underFire`); the
 * token icon is the VIEW, kept in sync so the condition shows, syncs and persists
 * instead of hiding in an invisible boolean (roadmap P1, Simple Skirmish's
 * syncDefeated pattern). Numeric markers stay `NumberField`s.
 */

export const DAMAGED_STATUS = `${MODULE_ID}-damaged`;
export const KNOCKED_OUT_STATUS = `${MODULE_ID}-knocked-out`;
export const UNDER_FIRE_STATUS = `${MODULE_ID}-under-fire`;

export interface StatusEffectConfig {
  id: string;
  name: string;
  img: string;
}

/** The conditions this ruleset contributes. Core Foundry SVGs only — no artwork. */
export function dirtsideStatusEffects(): StatusEffectConfig[] {
  return [
    { id: DAMAGED_STATUS, name: `${MODULE_ID}.status.damaged`, img: "icons/svg/downgrade.svg" },
    { id: KNOCKED_OUT_STATUS, name: `${MODULE_ID}.status.knocked-out`, img: "icons/svg/skull.svg" },
    { id: UNDER_FIRE_STATUS, name: `${MODULE_ID}.status.under-fire`, img: "icons/svg/target.svg" },
  ];
}

function statusApi(): { register: (e: StatusEffectConfig) => void } | undefined {
  const scope = globalThis as {
    battleframe?: { status?: { register: (e: StatusEffectConfig) => void } };
    game?: { battleframe?: { status?: { register: (e: StatusEffectConfig) => void } } };
  };
  return scope.battleframe?.status ?? scope.game?.battleframe?.status;
}

/** Registers the conditions via the engine status registry at init. Idempotent. */
export function registerStatusEffects(): void {
  const registry = statusApi();
  if (!registry) {
    return;
  }
  for (const effect of dirtsideStatusEffects()) {
    registry.register(effect);
  }
}

export interface StatusFlags {
  damaged: boolean;
  knockedOut: boolean;
  underFire: boolean;
  /** knocked-out drops the token from the turn order via Foundry's DEFEATED. */
  defeated: boolean;
}

/** Pure field → icon decision. `damage` drives damaged/knocked-out; `underFire` its own flag. */
export function statusFlagsFor(system: { damage?: string; underFire?: boolean }): StatusFlags {
  const knockedOut = system.damage === "knocked-out";
  return {
    damaged: system.damage === "damaged",
    knockedOut,
    underFire: system.underFire === true,
    defeated: knockedOut,
  };
}

interface StatusActorLike {
  system?: { damage?: string; underFire?: boolean };
  toggleStatusEffect?: (id: string, opts?: { active?: boolean }) => Promise<unknown>;
}

/**
 * Syncs an element's status icons from its data fields (the truth). Glue: toggles
 * each condition + the core DEFEATED skull when knocked out. Live-verified.
 */
export async function syncElementStatus(actor: StatusActorLike): Promise<void> {
  const flags = statusFlagsFor(actor.system ?? {});
  const defeated =
    (globalThis as unknown as { CONFIG?: { specialStatusEffects?: { DEFEATED?: string } } }).CONFIG
      ?.specialStatusEffects?.DEFEATED ?? "dead";
  await actor.toggleStatusEffect?.(DAMAGED_STATUS, { active: flags.damaged });
  await actor.toggleStatusEffect?.(KNOCKED_OUT_STATUS, { active: flags.knockedOut });
  await actor.toggleStatusEffect?.(UNDER_FIRE_STATUS, { active: flags.underFire });
  await actor.toggleStatusEffect?.(defeated, { active: flags.defeated });
}

import { MODULE_ID, VEHICLE_ACTOR_TYPE, UNIT_ACTOR_TYPE, UNIT_ID_FLAG } from "../constants";
import { applyCommandLoss, type Confidence, type ForceC3 } from "./c3";

/**
 * G9 — wires A11's command-loss ripple to a live element-damage transition: when
 * a command vehicle reaches knocked-out, the whole force drops a confidence level
 * and is barred from new offensives + rally, with the C3 state persisted on the
 * Combat document (never a module `let`). The DECISION + the force→C3 mapping are
 * pure; the updateActor hook is glue (parent live-verifies).
 */

const FLAG_SCOPE = MODULE_ID;
const C3_FLAG = "c3";
const VEHICLE_TYPE = `${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`;
const UNIT_TYPE = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;

/** Fires when a command vehicle transitions INTO knocked-out (not already there). */
export function commandLossTriggered(
  prev: { damage?: string },
  next: { damage?: string; isCommandVehicle?: boolean }
): boolean {
  return (
    next.isCommandVehicle === true &&
    next.damage === "knocked-out" &&
    prev.damage !== "knocked-out"
  );
}

export interface UnitActorLike {
  id: string;
  system?: { confidence?: Confidence };
}

/** Builds the A11 force object from the force's unit actors (flags start clear). */
export function forceC3FromUnits(units: readonly UnitActorLike[]): ForceC3 {
  return {
    units: units.map((u) => ({ id: u.id, confidence: u.system?.confidence ?? "confident" })),
    noNewOffensives: false,
    noRally: false,
  };
}

/* ---- Foundry glue -------------------------------------------------------- */

function glob(): any {
  return globalThis as any;
}

function activeCombat(): any | undefined {
  const g = glob().game;
  return g?.combat ?? g?.combats?.active;
}

function sideOfVehicleToken(vehicleActorId: string): number | undefined {
  const placeables = (glob().canvas?.tokens?.placeables ?? []) as any[];
  const token = placeables.find((t) => t?.actor?.id === vehicleActorId);
  return token?.document?.disposition;
}

/**
 * Applies the force-wide command-loss ripple: every unit on the losing side
 * drops a confidence level (A11), and the C3 lock is written to the Combat flag.
 * `sameSide` decides which units belong to the fallen commander's force.
 */
export async function applyForceCommandLoss(
  losingUnits: readonly (UnitActorLike & { update?: (d: Record<string, unknown>) => Promise<unknown> })[]
): Promise<void> {
  const after = applyCommandLoss(forceC3FromUnits(losingUnits));

  const byId = new Map(losingUnits.map((u) => [u.id, u]));
  for (const unit of after.units) {
    await byId.get(unit.id)?.update?.({ "system.confidence": unit.confidence });
  }

  const combat = activeCombat();
  await combat?.setFlag?.(FLAG_SCOPE, C3_FLAG, {
    noNewOffensives: after.noNewOffensives,
    noRally: after.noRally,
  });
}

/** The updateActor hook body: on a command-vehicle knockout, ripple to its force. */
export async function onActorUpdate(actor: any, changes: any): Promise<void> {
  if (actor?.type !== VEHICLE_TYPE) {
    return;
  }
  const nextDamage = changes?.system?.damage ?? actor?.system?.damage;
  const prevDamage = changes?.system?.damage ? actor?.system?.damage : undefined;
  const next = { damage: nextDamage, isCommandVehicle: actor?.system?.isCommandVehicle };
  // `changes.system.damage` present means this update set it; the pre-update value
  // is the actor's current system.damage BEFORE Foundry applied the change. Since
  // updateActor fires post-apply here we approximate the transition off changes.
  if (!changes?.system?.damage || !commandLossTriggered({ damage: prevDamage }, next)) {
    return;
  }

  // A Foundry hook must never reject: an actor update (or the C3 setFlag) that
  // fails cannot be allowed to surface an unhandled rejection into the updateActor
  // pipeline. Guard the whole effectful body and log instead.
  try {
    const disposition = sideOfVehicleToken(actor.id);
    const actors = (glob().game?.actors?.contents ?? glob().game?.actors ?? []) as any[];
    const unitId = actor.getFlag?.(FLAG_SCOPE, UNIT_ID_FLAG) ?? actor.flags?.[FLAG_SCOPE]?.[UNIT_ID_FLAG];

    // The force = every unit whose elements share this side. Approximated by the
    // command vehicle's own unit's side; MVP treats all units on the same token
    // disposition as one force.
    const losingUnits = actors.filter((a: any) => {
      if (a?.type !== UNIT_TYPE) return false;
      if (a.id === unitId) return true;
      // side match via any element token of that unit
      const placeables = (glob().canvas?.tokens?.placeables ?? []) as any[];
      return placeables.some(
        (t) =>
          (t?.actor?.getFlag?.(FLAG_SCOPE, UNIT_ID_FLAG) ?? t?.actor?.flags?.[FLAG_SCOPE]?.[UNIT_ID_FLAG]) === a.id &&
          t?.document?.disposition === disposition
      );
    });

    await applyForceCommandLoss(losingUnits);
  } catch (error) {
    console.error(`${MODULE_ID} | command-loss ripple failed`, error);
  }
}

export function registerCommandLossHook(): void {
  const hooks = glob().Hooks;
  hooks?.on?.("updateActor", (actor: any, changes: any) => void onActorUpdate(actor, changes));
}

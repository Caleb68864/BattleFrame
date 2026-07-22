/**
 * The weapons-fire phase as an activation order over the ships on the table. The
 * turn-order MACHINE (winner acts, strict alternation, serialize/restore) is the
 * ENGINE's -- `game.battleframe.rounds` -- not the module's: Full Thrust's fire
 * phase is the no-priority-tier, default-alternation case of the engine's
 * activation order, so we consume it instead of duplicating it (see
 * docs/plans/2026-07-22-full-thrust-engine-extraction-findings.md, finding 1).
 *
 * What stays the ruleset's: how sides are decided (token disposition), gathering
 * the ship tokens, and the d6 initiative roll-off (`determineInitiative`).
 *
 * Source: FT2 "Initiative", "Sequence of Play".
 */

import { SHIP_ACTOR_TYPE } from "../constants";
import { isShipDestroyed } from "../data/ship-state";

// --- Ruleset-specific: sides, ships, initiative ------------------------------

export interface InitiativeRoll {
  sideId: string;
  roll: number;
}

/**
 * The side that won initiative (highest roll), or null on a tie so the caller
 * rerolls. (Not part of the engine's ordering -- the roll-off is Full Thrust's.)
 */
export function determineInitiative(rolls: readonly InitiativeRoll[]): string | null {
  let best: InitiativeRoll | undefined;
  let tied = false;
  for (const entry of rolls) {
    if (!best || entry.roll > best.roll) {
      best = entry;
      tied = false;
    } else if (entry.roll === best.roll) {
      tied = true;
    }
  }
  return best && !tied ? best.sideId : null;
}

/** The side id of a ship token: its disposition as a string (default "0"). */
export function shipSideOf(token: any): string {
  const disposition = token?.document?.disposition ?? token?.disposition ?? 0;
  return String(disposition);
}

export interface FireShipToken {
  id: string;
  sideId: string;
  token: any;
}

/** The ship tokens among `tokens`, each tagged with its id and side. */
export function collectFireShips(tokens: readonly any[]): FireShipToken[] {
  const ships: FireShipToken[] = [];
  for (const token of tokens) {
    const type = token?.actor?.type;
    if (typeof type === "string" && type.endsWith(SHIP_ACTOR_TYPE) && token.id) {
      ships.push({ id: token.id, sideId: shipSideOf(token), token });
    }
  }
  return ships;
}

// --- Engine activation-order glue -------------------------------------------

/** The engine's serialized activation-order state (persisted on a Document). */
export type FireSessionState = {
  firstSideId: string;
  activatedIds: string[];
  priorityPointer: number;
  mainPointer: number;
  cachedMainSide?: string;
};

/** The slice of the engine's ActivationOrder the fire phase uses. */
export interface ActivationOrderLike {
  activeSideId(): string | undefined;
  eligible(sideId: string): string[];
  activate(unitId: string): void;
  isComplete(): boolean;
  serialize(): FireSessionState;
}

/** The slice of `game.battleframe.rounds` the fire phase uses. */
export interface RoundsApiLike {
  createActivationOrder(params: {
    units: Array<{ id: string; sideId: string; isResolved?: () => boolean }>;
    firstSideId: string;
  }): ActivationOrderLike;
  restoreActivationOrder(params: {
    units: Array<{ id: string; sideId: string; isResolved?: () => boolean }>;
    state: FireSessionState;
  }): ActivationOrderLike;
}

function toUnits(ships: readonly FireShipToken[]) {
  // A destroyed ship is "resolved" so the order can complete without it.
  return ships.map((s) => ({
    id: s.id,
    sideId: s.sideId,
    isResolved: () => (s.token?.actor ? isShipDestroyed(s.token.actor) : false)
  }));
}

/** Opens a fresh fire order via the engine (winning side first, then alternation). */
export function createFireOrder(
  rounds: RoundsApiLike,
  ships: readonly FireShipToken[],
  firstSideId: string
): ActivationOrderLike {
  return rounds.createActivationOrder({ units: toUnits(ships), firstSideId });
}

/** Rebuilds the fire order from persisted state + the freshly-gathered ships. */
export function restoreFireOrder(
  rounds: RoundsApiLike,
  ships: readonly FireShipToken[],
  state: FireSessionState
): ActivationOrderLike {
  return rounds.restoreActivationOrder({ units: toUnits(ships), state });
}

/** Whether `shipId` (on `sideId`) may fire now: its side's turn and it is eligible. */
export function canShipFire(order: ActivationOrderLike, sideId: string, shipId: string): boolean {
  return order.activeSideId() === sideId && order.eligible(sideId).includes(shipId);
}

/**
 * A readable name for a side id. Sides are Foundry token dispositions as strings
 * (`shipSideOf` = `String(token.document.disposition)`); this maps the standard
 * dispositions to friendly names and falls back to `Side N` for anything else.
 */
export function sideLabel(sideId: string): string {
  switch (sideId) {
    case "1":
      return "Friendly";
    case "-1":
      return "Hostile";
    case "0":
      return "Neutral";
    case "-2":
      return "Secret";
    default:
      return `Side ${sideId}`;
  }
}

/**
 * The visible fire-phase tracker line (roadmap #12): whose side fires next and
 * how many of its ships are still eligible, or a completion notice. Pure over the
 * activation order so it is unit-tested and reused by the chat announcement.
 */
export function firePhaseStatusLine(order: ActivationOrderLike): string {
  const active = order.isComplete() ? undefined : order.activeSideId();
  if (!active) {
    return "Fire phase complete.";
  }
  const remaining = order.eligible(active).length;
  return `${sideLabel(active)} to fire — ${remaining} ship(s) still to activate.`;
}

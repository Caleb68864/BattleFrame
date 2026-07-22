/**
 * The weapons-fire phase as a session over the ships on the table: which side a
 * ship is on, gathering the ship tokens, and the "may this ship fire right now?"
 * check that enforces initiative + strict alternation. Wraps the pure
 * `./fire-phase` machine; the persistence (a Document flag) and the dice roll for
 * initiative are the scene-control glue.
 *
 * Side = the token's disposition (set one fleet Friendly, the other Hostile), so
 * a two-player fight groups correctly without any extra tagging.
 *
 * Source: FT2 "Initiative", "Sequence of Play".
 */

import { SHIP_ACTOR_TYPE } from "../constants";
import {
  createFirePhase,
  determineInitiative,
  type FirePhase,
  type FirePhaseShip
} from "./fire-phase";

export type FireSessionState = ReturnType<FirePhase["serialize"]>;

/** The side id of a ship token: its disposition as a string (default "0"). */
export function shipSideOf(token: any): string {
  const disposition = token?.document?.disposition ?? token?.disposition ?? 0;
  return String(disposition);
}

export interface FireShipToken extends FirePhaseShip {
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

/** Whether `shipId` (on `sideId`) may fire now: it is the active side's turn and the ship is eligible. */
export function canShipFire(phase: FirePhase, sideId: string, shipId: string): boolean {
  return phase.activeSide() === sideId && phase.eligible().includes(shipId);
}

/** Rebuilds a fire phase from serialized state and the freshly-gathered ships. */
export function restoreFireSession(
  ships: readonly FirePhaseShip[],
  state: FireSessionState
): FirePhase {
  return createFirePhase({
    ships,
    firstSideId: state.firstSideId,
    fired: state.fired,
    activeSideId: state.activeSideId
  });
}

export { createFirePhase, determineInitiative };
export type { FirePhase, FirePhaseShip };

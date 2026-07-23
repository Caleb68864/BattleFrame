/**
 * The phase-aware turn: pure decisions that let the GM-less ready/advance walk a
 * Full Thrust turn automatically instead of dropping straight to end-of-turn
 * cleanup. A turn has two mechanical phases -- PLOT (secret movement orders) and
 * FIRE (weapons in initiative order) -- with the fire-phase indicator
 * (`FIRE_PHASE_FLAG`, present = in the fire phase) as the single source of truth
 * for which phase we're in.
 *
 * Everything here is Foundry-free so the phase machine is unit-tested independently
 * of the scene-control glue in `ui/round-control.ts`, which reads the live
 * documents and calls these functions.
 *
 * Source: FT2 "Sequence of Play" (Order Plotting, Movement, Fire).
 */

import { availableShipActions, type ShipActionAvailability } from "../ship/ship-actions";

/** The two mechanical phases of a Full Thrust turn. */
export type TurnPhase = "plot" | "fire";

/** What advancing does next, given whether a weapons-fire phase is running. */
export type PhaseAdvance = "execute-then-fire" | "end-turn";

/**
 * What the GM-less advance should do next. No fire phase running = we're in the
 * PLOT phase, so advancing reveals + moves every plotted ship then opens the fire
 * phase (initiative). A fire phase running = advancing ENDS the turn (clear plots,
 * close the fire phase, fly missiles), returning to plotting.
 */
export function nextPhaseAction(firePhaseActive: boolean): PhaseAdvance {
  return firePhaseActive ? "end-turn" : "execute-then-fire";
}

/** A ship's per-phase state, read off its flags by the glue. */
export interface OwnedShipState {
  name: string;
  /** Has a secretly-plotted movement order this turn. */
  plotted: boolean;
  /** Has fired in the current fire phase (its token id is in the fire order). */
  fired: boolean;
  /** Marked "done / held" for this phase -- the player has chosen to skip it. */
  held: boolean;
  /** The ship's system block, for deriving its available actions. */
  system: Parameters<typeof availableShipActions>[0];
}

/**
 * Whether a ship still owes its owner an action this phase. A HELD ("done") ship
 * never nags; otherwise a plot-phase ship is pending until it has a plotted order,
 * and a fire-phase ship until it has fired.
 */
export function isShipPending(
  phase: TurnPhase,
  ship: { plotted: boolean; fired: boolean; held: boolean }
): boolean {
  if (ship.held) {
    return false;
  }
  return phase === "plot" ? !ship.plotted : !ship.fired;
}

/** A pending ship: its name plus the actions it can still take (for the guard). */
export interface PendingShip {
  name: string;
  actions: ShipActionAvailability;
}

/**
 * The owned ships that still have an action this phase, each tagged with what it
 * can do. Feeds the premature-ready guard dialog so a player who marks ready with
 * un-plotted / un-fired ships is shown exactly which ones (and their options).
 */
export function pendingShips(phase: TurnPhase, ownedShips: readonly OwnedShipState[]): PendingShip[] {
  return ownedShips
    .filter((ship) => isShipPending(phase, ship))
    .map((ship) => ({ name: ship.name, actions: availableShipActions(ship.system) }));
}

/** Friendly labels for each ShipActionAvailability flag, in a stable display order. */
const ACTION_LABELS: ReadonlyArray<[keyof ShipActionAvailability, string]> = [
  ["plot", "Plot"],
  ["fire", "Fire"],
  ["splitFire", "Split Fire"],
  ["needle", "Needle"],
  ["salvo", "Salvo"],
  ["nova", "Nova"],
  ["waveGun", "Wave Gun"],
  ["launchFighters", "Launch"],
  ["recoverFighters", "Recover"]
];

/** The available-action labels for a ship, in catalogue order (for the guard line). */
export function pendingActionLabels(actions: ShipActionAvailability): string[] {
  return ACTION_LABELS.filter(([key]) => actions[key]).map(([, label]) => label);
}

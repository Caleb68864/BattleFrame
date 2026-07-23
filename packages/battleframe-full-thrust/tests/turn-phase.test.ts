import { describe, expect, it } from "vitest";
import {
  nextPhaseAction,
  isShipPending,
  pendingShips,
  pendingActionLabels,
  type OwnedShipState
} from "../src/round/turn-phase";

/** A beam ship system with full thrust + fire control (overridable). */
function shipSystem(over: Record<string, any> = {}): Record<string, any> {
  return {
    thrust: 4,
    driveHits: 0,
    fcs: 1,
    fcsLost: 0,
    bays: 0,
    weapons: [{ kind: "beam", destroyed: false, spent: false }],
    ...over
  };
}

function owned(over: Partial<OwnedShipState> = {}): OwnedShipState {
  return {
    name: "RNS Lion",
    plotted: false,
    fired: false,
    held: false,
    system: shipSystem(),
    ...over
  };
}

describe("nextPhaseAction", () => {
  it("plots -> execute-then-fire when no fire phase is running", () => {
    expect(nextPhaseAction(false)).toBe("execute-then-fire");
  });

  it("ends the turn when the fire phase is running", () => {
    expect(nextPhaseAction(true)).toBe("end-turn");
  });
});

describe("isShipPending", () => {
  it("plot phase: pending until the ship has a plotted order", () => {
    expect(isShipPending("plot", { plotted: false, fired: false, held: false })).toBe(true);
    expect(isShipPending("plot", { plotted: true, fired: false, held: false })).toBe(false);
  });

  it("fire phase: pending until the ship has fired", () => {
    expect(isShipPending("fire", { plotted: false, fired: false, held: false })).toBe(true);
    expect(isShipPending("fire", { plotted: false, fired: true, held: false })).toBe(false);
  });

  it("a held ship is never pending in either phase", () => {
    expect(isShipPending("plot", { plotted: false, fired: false, held: true })).toBe(false);
    expect(isShipPending("fire", { plotted: false, fired: false, held: true })).toBe(false);
  });
});

describe("pendingShips", () => {
  it("plot phase: lists un-plotted, un-held owned ships with their actions", () => {
    const ships = [
      owned({ name: "RNS Lion", plotted: false }),
      owned({ name: "RNS Tiger", plotted: true }),
      owned({ name: "RNS Held", plotted: false, held: true })
    ];
    const pending = pendingShips("plot", ships);
    expect(pending.map((p) => p.name)).toEqual(["RNS Lion"]);
    expect(pending[0].actions.plot).toBe(true);
    expect(pending[0].actions.fire).toBe(true);
  });

  it("fire phase: lists ships that have not yet fired", () => {
    const ships = [
      owned({ name: "RNS Lion", fired: false }),
      owned({ name: "RNS Tiger", fired: true })
    ];
    expect(pendingShips("fire", ships).map((p) => p.name)).toEqual(["RNS Lion"]);
  });

  it("returns nothing when every owned ship has acted or is held", () => {
    const ships = [owned({ plotted: true }), owned({ held: true })];
    expect(pendingShips("plot", ships)).toEqual([]);
  });
});

describe("pendingActionLabels", () => {
  it("lists a healthy beam ship's actions as friendly labels", () => {
    const labels = pendingActionLabels(pendingShips("plot", [owned()])[0].actions);
    expect(labels).toContain("Plot");
    expect(labels).toContain("Fire");
  });

  it("surfaces a nova ship's spinal action", () => {
    const ship = owned({ system: shipSystem({ novaCannon: true }) });
    expect(pendingActionLabels(pendingShips("plot", [ship])[0].actions)).toContain("Nova");
  });
});

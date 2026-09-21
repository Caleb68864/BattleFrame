import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { availableShipActions } from "../src/ship/ship-actions";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


/** A minimal ship system with a beam and full fire control, overridable. */
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

describe("availableShipActions", () => {
  it("a healthy beam ship can plot and fire, but not the weapon-specific actions", () => {
    const a = availableShipActions(shipSystem());
    expect(a.plot).toBe(true);
    expect(a.fire).toBe(true);
    expect(a.needle).toBe(false);
    expect(a.salvo).toBe(false);
    expect(a.nova).toBe(false);
    expect(a.waveGun).toBe(false);
    expect(a.launchFighters).toBe(false);
    expect(a.recoverFighters).toBe(false);
  });

  it("a ship with dead drives (driveHits 2) cannot plot", () => {
    expect(availableShipActions(shipSystem({ driveHits: 2 })).plot).toBe(false);
  });

  it("a ship with zero thrust cannot plot", () => {
    expect(availableShipActions(shipSystem({ thrust: 0 })).plot).toBe(false);
  });

  it("a half-crippled ship (driveHits 1) with thrust left can still plot", () => {
    expect(availableShipActions(shipSystem({ thrust: 4, driveHits: 1 })).plot).toBe(true);
  });

  it("a ship whose every weapon is destroyed cannot fire", () => {
    const a = availableShipActions(shipSystem({ weapons: [{ kind: "beam", destroyed: true }] }));
    expect(a.fire).toBe(false);
  });

  it("a ship that has lost all its fire control cannot fire even with a live weapon", () => {
    const a = availableShipActions(shipSystem({ fcs: 1, fcsLost: 1 }));
    expect(a.fire).toBe(false);
  });

  it("a ship with no weapons at all cannot fire", () => {
    expect(availableShipActions(shipSystem({ weapons: [] })).fire).toBe(false);
  });

  it("a spent one-shot weapon does not count as fire-capable", () => {
    const a = availableShipActions(shipSystem({ weapons: [{ kind: "submunition", spent: true }] }));
    expect(a.fire).toBe(false);
  });

  it("offers needle only when an undamaged needle beam is mounted", () => {
    expect(availableShipActions(shipSystem()).needle).toBe(false);
    const withNeedle = availableShipActions(
      shipSystem({ weapons: [{ kind: "beam" }, { kind: "needle", destroyed: false }] })
    );
    expect(withNeedle.needle).toBe(true);
    const knockedOut = availableShipActions(
      shipSystem({ weapons: [{ kind: "needle", destroyed: true }] })
    );
    expect(knockedOut.needle).toBe(false);
  });

  it("offers salvo only when an unspent salvo launcher is mounted", () => {
    expect(availableShipActions(shipSystem({ weapons: [{ kind: "salvo" }] })).salvo).toBe(true);
    expect(availableShipActions(shipSystem({ weapons: [{ kind: "salvo", spent: true }] })).salvo).toBe(false);
  });

  it("offers split fire only when two or more fire-control systems remain", () => {
    expect(availableShipActions(shipSystem({ fcs: 1 })).splitFire).toBe(false);
    expect(availableShipActions(shipSystem({ fcs: 2, fcsLost: 0 })).splitFire).toBe(true);
    expect(availableShipActions(shipSystem({ fcs: 3, fcsLost: 2 })).splitFire).toBe(false);
  });

  it("offers carrier ops only when the ship has fighter bays", () => {
    const carrier = availableShipActions(shipSystem({ bays: 2 }));
    expect(carrier.launchFighters).toBe(true);
    expect(carrier.recoverFighters).toBe(true);
    const notCarrier = availableShipActions(shipSystem({ bays: 0 }));
    expect(notCarrier.launchFighters).toBe(false);
  });

  it("offers spinal weapons only when the ship is flagged as mounting them", () => {
    expect(availableShipActions(shipSystem({ novaCannon: true })).nova).toBe(true);
    expect(availableShipActions(shipSystem({ waveGun: true })).waveGun).toBe(true);
    expect(availableShipActions(shipSystem()).nova).toBe(false);
  });

  it("tolerates a missing/empty system object", () => {
    const a = availableShipActions(undefined as any);
    expect(a.plot).toBe(false);
    expect(a.fire).toBe(false);
  });

  it("treats a ship with an undefined fcs field as able to fire (design default)", () => {
    const a = availableShipActions({ thrust: 4, weapons: [{ kind: "beam" }] });
    expect(a.fire).toBe(true);
  });
});

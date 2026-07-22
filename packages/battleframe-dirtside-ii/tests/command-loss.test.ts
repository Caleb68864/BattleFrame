import { afterEach, describe, expect, it } from "vitest";
import {
  commandLossTriggered,
  forceC3FromUnits,
  onActorUpdate,
  type UnitActorLike,
} from "../src/round/command-loss";
import { MODULE_ID, VEHICLE_ACTOR_TYPE } from "../src/constants";

/**
 * G9 — wiring A11's command-loss ripple to a live element-damage transition. The
 * DECISION (did a command element just die?) and the force→C3 mapping are pure +
 * tested here; the updateActor hook that fires them is glue.
 */

describe("commandLossTriggered — a command vehicle reaching knocked-out", () => {
  it("fires only on the transition INTO knocked-out for a command vehicle", () => {
    expect(commandLossTriggered({ damage: "damaged" }, { damage: "knocked-out", isCommandVehicle: true })).toBe(true);
  });
  it("does not fire for a non-command vehicle", () => {
    expect(commandLossTriggered({ damage: "ok" }, { damage: "knocked-out", isCommandVehicle: false })).toBe(false);
  });
  it("does not fire when already knocked-out (no transition)", () => {
    expect(commandLossTriggered({ damage: "knocked-out" }, { damage: "knocked-out", isCommandVehicle: true })).toBe(false);
  });
  it("does not fire for a non-knockout update", () => {
    expect(commandLossTriggered({ damage: "ok" }, { damage: "damaged", isCommandVehicle: true })).toBe(false);
  });
});

describe("forceC3FromUnits — build the A11 force object from unit actors", () => {
  it("collects each unit's id + confidence, flags cleared", () => {
    const units: UnitActorLike[] = [
      { id: "u1", system: { confidence: "confident" } },
      { id: "u2", system: { confidence: "shaken" } },
    ];
    expect(forceC3FromUnits(units)).toEqual({
      units: [
        { id: "u1", confidence: "confident" },
        { id: "u2", confidence: "shaken" },
      ],
      noNewOffensives: false,
      noRally: false,
    });
  });
});

describe("onActorUpdate — the updateActor hook body must never throw", () => {
  const g = globalThis as any;
  afterEach(() => {
    delete g.game;
    delete g.canvas;
  });

  it("swallows a rejecting Combat#setFlag instead of rejecting the hook", async () => {
    // A command vehicle transitions into knocked-out, but persisting the C3 lock
    // fails (e.g. the GM lost the socket). The hook must resolve, not surface an
    // unhandled rejection into Foundry's updateActor pipeline.
    g.canvas = { tokens: { placeables: [] } };
    g.game = {
      actors: { contents: [] },
      combat: {
        setFlag: async () => {
          throw new Error("setFlag failed");
        },
      },
    };

    const actor = {
      type: `${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`,
      id: "v1",
      system: { damage: "damaged", isCommandVehicle: true },
      getFlag: () => undefined,
    };
    const changes = { system: { damage: "knocked-out" } };

    await expect(onActorUpdate(actor, changes)).resolves.toBeUndefined();
  });
});

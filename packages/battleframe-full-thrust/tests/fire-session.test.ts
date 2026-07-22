import { describe, expect, it } from "vitest";
import {
  shipSideOf,
  collectFireShips,
  canShipFire,
  restoreFireSession
} from "../src/round/fire-session";
import { createFirePhase } from "../src/round/fire-phase";

function shipToken(id: string, disposition: number) {
  return { id, actor: { type: "battleframe-full-thrust.ship" }, document: { disposition } };
}

describe("shipSideOf (token disposition is the side)", () => {
  it("groups by disposition", () => {
    expect(shipSideOf(shipToken("a", 1))).toBe("1");
    expect(shipSideOf(shipToken("b", -1))).toBe("-1");
  });
  it("defaults to neutral (0) when disposition is missing", () => {
    expect(shipSideOf({ id: "x" })).toBe("0");
  });
});

describe("collectFireShips", () => {
  it("keeps only ship tokens, tagged with id + side", () => {
    const tokens = [
      shipToken("a1", 1),
      shipToken("b1", -1),
      { id: "f1", actor: { type: "battleframe-full-thrust.fighter-group" }, document: { disposition: 1 } },
      { id: "none", actor: undefined }
    ];
    const ships = collectFireShips(tokens);
    expect(ships.map((s) => s.id)).toEqual(["a1", "b1"]);
    expect(ships[0].sideId).toBe("1");
    expect(ships[1].sideId).toBe("-1");
  });
});

describe("canShipFire", () => {
  const ships = [
    { id: "a1", sideId: "1" },
    { id: "a2", sideId: "1" },
    { id: "b1", sideId: "-1" }
  ];

  it("allows only an eligible ship on the active side", () => {
    const phase = createFirePhase({ ships, firstSideId: "1" });
    expect(canShipFire(phase, "1", "a1")).toBe(true);
    expect(canShipFire(phase, "-1", "b1")).toBe(false); // not the active side
  });

  it("disallows a ship that already fired", () => {
    const phase = createFirePhase({ ships, firstSideId: "1" });
    phase.fire("a1");
    phase.fire("b1");
    expect(canShipFire(phase, "1", "a1")).toBe(false);
  });
});

describe("restoreFireSession", () => {
  it("rebuilds a phase from serialized state + freshly gathered ships", () => {
    const ships = [
      { id: "a1", sideId: "1" },
      { id: "b1", sideId: "-1" }
    ];
    const phase = createFirePhase({ ships, firstSideId: "1" });
    phase.fire("a1");
    const state = phase.serialize();

    const restored = restoreFireSession(ships, state);
    expect(restored.activeSide()).toBe("-1"); // a1 already fired, b's turn
    expect(canShipFire(restored, "1", "a1")).toBe(false);
    expect(canShipFire(restored, "-1", "b1")).toBe(true);
  });
});

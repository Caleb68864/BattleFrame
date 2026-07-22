import { describe, expect, it, vi } from "vitest";
import {
  determineInitiative,
  shipSideOf,
  collectFireShips,
  canShipFire,
  createFireOrder,
  restoreFireOrder,
  type ActivationOrderLike,
  type RoundsApiLike
} from "../src/round/fire-session";

function shipToken(id: string, disposition: number) {
  return { id, actor: { type: "battleframe-full-thrust.ship" }, document: { disposition } };
}

describe("determineInitiative (highest roll wins; tie -> null)", () => {
  it("returns the highest side", () => {
    expect(determineInitiative([{ sideId: "a", roll: 3 }, { sideId: "b", roll: 5 }])).toBe("b");
  });
  it("returns null on a tie", () => {
    expect(determineInitiative([{ sideId: "a", roll: 4 }, { sideId: "b", roll: 4 }])).toBeNull();
  });
});

describe("shipSideOf / collectFireShips", () => {
  it("groups ships by disposition and keeps only ship tokens", () => {
    expect(shipSideOf(shipToken("a", 1))).toBe("1");
    const ships = collectFireShips([
      shipToken("a1", 1),
      shipToken("b1", -1),
      { id: "f1", actor: { type: "battleframe-full-thrust.fighter-group" }, document: { disposition: 1 } }
    ]);
    expect(ships.map((s) => s.id)).toEqual(["a1", "b1"]);
    expect(ships[1].sideId).toBe("-1");
  });
});

describe("engine activation-order glue", () => {
  it("createFireOrder maps ships to units and delegates to the engine rounds API", () => {
    const createActivationOrder = vi.fn(() => ({} as ActivationOrderLike));
    const rounds = { createActivationOrder, restoreActivationOrder: vi.fn() } as unknown as RoundsApiLike;
    createFireOrder(rounds, [{ id: "a1", sideId: "1", token: {} }], "1");
    const params = createActivationOrder.mock.calls[0][0] as any;
    expect(params.firstSideId).toBe("1");
    expect(params.units[0].id).toBe("a1");
    expect(params.units[0].sideId).toBe("1");
    expect(typeof params.units[0].isResolved).toBe("function");
  });

  it("restoreFireOrder delegates with the persisted state", () => {
    const restoreActivationOrder = vi.fn(() => ({} as ActivationOrderLike));
    const rounds = { createActivationOrder: vi.fn(), restoreActivationOrder } as unknown as RoundsApiLike;
    const state = { firstSideId: "1", activatedIds: ["a1"], priorityPointer: 0, mainPointer: 1 };
    restoreFireOrder(rounds, [{ id: "a1", sideId: "1", token: {} }], state);
    expect((restoreActivationOrder.mock.calls[0][0] as any).state).toBe(state);
  });

  it("canShipFire is true only for an eligible ship on the active side", () => {
    const order: ActivationOrderLike = {
      activeSideId: () => "1",
      eligible: (sideId) => (sideId === "1" ? ["a1", "a2"] : ["b1"]),
      activate: () => {},
      isComplete: () => false,
      serialize: () => ({ firstSideId: "1", activatedIds: [], priorityPointer: 0, mainPointer: 0 })
    };
    expect(canShipFire(order, "1", "a1")).toBe(true);
    expect(canShipFire(order, "1", "b1")).toBe(false); // not eligible on side 1
    expect(canShipFire(order, "-1", "b1")).toBe(false); // not the active side
  });
});

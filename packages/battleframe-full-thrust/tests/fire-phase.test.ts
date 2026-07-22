import { describe, expect, it } from "vitest";
import { determineInitiative, createFirePhase } from "../src/round/fire-phase";

describe("determineInitiative (highest roll wins; tie -> reroll)", () => {
  it("returns the side with the highest roll", () => {
    expect(determineInitiative([{ sideId: "a", roll: 3 }, { sideId: "b", roll: 5 }])).toBe("b");
  });
  it("returns null on a tie so the caller rerolls", () => {
    expect(determineInitiative([{ sideId: "a", roll: 4 }, { sideId: "b", roll: 4 }])).toBeNull();
  });
});

describe("createFirePhase (winner fires one ship, then strict alternation)", () => {
  const ships = [
    { id: "a1", sideId: "a" },
    { id: "a2", sideId: "a" },
    { id: "b1", sideId: "b" }
  ];

  it("starts with the initiative winner's side active", () => {
    const phase = createFirePhase({ ships, firstSideId: "b" });
    expect(phase.activeSide()).toBe("b");
    expect(phase.isComplete()).toBe(false);
  });

  it("alternates sides after each ship fires", () => {
    const phase = createFirePhase({ ships, firstSideId: "a" });
    expect(phase.activeSide()).toBe("a");
    phase.fire("a1");
    expect(phase.activeSide()).toBe("b");
    phase.fire("b1");
    expect(phase.activeSide()).toBe("a"); // back to a for its second ship
    phase.fire("a2");
    expect(phase.isComplete()).toBe(true);
  });

  it("stays on the side with ships left once the other is exhausted", () => {
    const phase = createFirePhase({ ships, firstSideId: "b" });
    phase.fire("b1"); // b exhausted
    expect(phase.activeSide()).toBe("a");
    phase.fire("a1");
    expect(phase.activeSide()).toBe("a"); // b has none; a keeps going
    phase.fire("a2");
    expect(phase.isComplete()).toBe(true);
  });

  it("rejects firing a ship that is not on the active side", () => {
    const phase = createFirePhase({ ships, firstSideId: "a" });
    expect(() => phase.fire("b1")).toThrow(/not the active side/);
  });

  it("rejects firing a ship twice", () => {
    const phase = createFirePhase({ ships, firstSideId: "a" });
    phase.fire("a1");
    phase.fire("b1");
    expect(() => phase.fire("a1")).toThrow(/already fired/);
  });

  it("reports which ships on the active side may still fire", () => {
    const phase = createFirePhase({ ships, firstSideId: "a" });
    expect(phase.eligible().sort()).toEqual(["a1", "a2"]);
  });
});

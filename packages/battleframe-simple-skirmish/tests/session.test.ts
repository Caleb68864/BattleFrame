import { describe, expect, it } from "vitest";
import {
  createSkirmishRound,
  determineFirstPlayer,
  IllegalActivationError,
  restoreSkirmishRound,
  type SkirmishUnit
} from "../src/round/session";

const units = (...specs: Array<[string, string]>): SkirmishUnit[] =>
  specs.map(([id, playerId]) => ({ id, playerId }));

describe("determineFirstPlayer", () => {
  it("gives the first turn to the highest initiative roll", () => {
    expect(determineFirstPlayer([{ playerId: "a", roll: 5 }, { playerId: "b", roll: 3 }])).toBe("a");
    expect(determineFirstPlayer([{ playerId: "a", roll: 2 }, { playerId: "b", roll: 6 }])).toBe("b");
  });

  it("returns null on a tie, so the caller can re-roll", () => {
    expect(determineFirstPlayer([{ playerId: "a", roll: 4 }, { playerId: "b", roll: 4 }])).toBeNull();
  });
});

describe("serialize / restoreSkirmishRound -- round state on a document", () => {
  it("round-trips the activation state so the round survives reconstruction", () => {
    const roster = units(["a1", "A"], ["a2", "A"], ["b1", "B"]);
    const round = createSkirmishRound(roster, "A");
    round.activate("a1"); // A goes, now B's turn

    const state = round.serialize();
    expect(state.firstPlayerId).toBe("A");
    expect(state.activatedIds).toEqual(["a1"]);
    expect(typeof state.turnPointer).toBe("number");

    const restored = restoreSkirmishRound(roster, state);
    expect(restored.isActivated("a1")).toBe(true);
    expect(restored.activePlayerId()).toBe("B");
    expect(restored.isComplete()).toBe(false);

    // The restored round continues correctly, alternating from where it left off.
    restored.activate("b1");
    expect(restored.activePlayerId()).toBe("A");
    restored.activate("a2");
    expect(restored.isComplete()).toBe(true);
  });

  it("preserves whose turn it is even when the last activation exhausted a side", () => {
    const roster = units(["a1", "A"], ["b1", "B"], ["b2", "B"]);
    const round = createSkirmishRound(roster, "A");
    round.activate("a1"); // A exhausted; B continues twice
    const restored = restoreSkirmishRound(roster, round.serialize());
    expect(restored.activePlayerId()).toBe("B");
    restored.activate("b1");
    expect(restored.activePlayerId()).toBe("B"); // A has nothing left, stays B
  });
});

describe("createSkirmishRound -- alternating activation", () => {
  it("alternates turns starting with the first player", () => {
    const round = createSkirmishRound(units(["a1", "a"], ["b1", "b"]), "a");

    expect(round.activePlayerId()).toBe("a");
    round.activate("a1");
    expect(round.isActivated("a1")).toBe(true);

    expect(round.activePlayerId()).toBe("b");
    round.activate("b1");

    expect(round.isComplete()).toBe(true);
    expect(round.activePlayerId()).toBeUndefined();
  });

  it("lets one side keep going once the other is out of units", () => {
    const round = createSkirmishRound(units(["a1", "a"], ["a2", "a"], ["b1", "b"]), "a");

    round.activate("a1"); // a
    expect(round.activePlayerId()).toBe("b");
    round.activate("b1"); // b, now out
    expect(round.activePlayerId()).toBe("a"); // a continues uninterrupted
    round.activate("a2");
    expect(round.isComplete()).toBe(true);
  });

  it("refuses to activate out of turn, an already-activated unit, or an unknown unit", () => {
    const round = createSkirmishRound(units(["a1", "a"], ["b1", "b"]), "a");

    expect(() => round.activate("b1")).toThrow(IllegalActivationError); // not b's turn
    round.activate("a1");
    expect(() => round.activate("a1")).toThrow(IllegalActivationError); // already activated
    expect(() => round.activate("ghost")).toThrow(IllegalActivationError); // unknown
  });

  it("fails loud when the first player controls no unit, rather than starting the wrong side", () => {
    expect(() => createSkirmishRound(units(["a1", "a"], ["b1", "b"]), "ghost")).toThrow(
      IllegalActivationError
    );
  });

  it("lists a player's un-activated units", () => {
    const round = createSkirmishRound(units(["a1", "a"], ["a2", "a"], ["b1", "b"]), "a");
    expect(round.unactivated("a").sort()).toEqual(["a1", "a2"]);
    round.activate("a1");
    expect(round.unactivated("a")).toEqual(["a2"]);
  });
});

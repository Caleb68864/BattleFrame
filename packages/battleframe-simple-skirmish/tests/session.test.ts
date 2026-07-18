import { describe, expect, it } from "vitest";
import {
  createSkirmishRound,
  determineFirstPlayer,
  IllegalActivationError,
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

  it("lists a player's un-activated units", () => {
    const round = createSkirmishRound(units(["a1", "a"], ["a2", "a"], ["b1", "b"]), "a");
    expect(round.unactivated("a").sort()).toEqual(["a1", "a2"]);
    round.activate("a1");
    expect(round.unactivated("a")).toEqual(["a2"]);
  });
});

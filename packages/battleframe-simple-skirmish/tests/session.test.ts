import { describe, expect, it } from "vitest";
import {
  createSkirmishRound,
  determineFirstPlayer,
  IllegalActivationError,
  isSkirmishRoundResumable,
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

describe("isSkirmishRoundResumable -- a stale flag must not brick the round tool", () => {
  // The round tool always takes the resume branch while a flag is non-complete,
  // rebuilding the persisted round with restoreSkirmishRound on every "Run Round"
  // click. If the persisted firstPlayerId names a side whose every token was
  // deleted between sessions, that restore throws (orderedPlayers has no side to
  // rotate to) -- and because the throw is on the always-taken resume path, a
  // single unresumable flag permanently bricks the tool. The glue guards with
  // this predicate and starts a FRESH round when it returns false.

  it("is true when the persisted first player still controls a unit on the canvas", () => {
    const roster = units(["a1", "A"], ["b1", "B"]);
    const state = createSkirmishRound(roster, "A").serialize();

    expect(isSkirmishRoundResumable(roster, state)).toBe(true);
  });

  it("is false when the persisted first player controls none of the current units", () => {
    const roster = units(["a1", "A"], ["b1", "B"]);
    // A's tokens were deleted between sessions -- only B remains on the canvas.
    const survivors = units(["b1", "B"]);
    const state = createSkirmishRound(roster, "A").serialize();

    expect(isSkirmishRoundResumable(survivors, state)).toBe(false);
  });

  it("documents the hazard the predicate exists to avoid: restore itself throws on a stale id", () => {
    const state = createSkirmishRound(units(["a1", "A"], ["b1", "B"]), "A").serialize();

    // The unguarded restore is the exact throw the resume branch would hit.
    expect(() => restoreSkirmishRound(units(["b1", "B"]), state)).toThrow(IllegalActivationError);
    // Guarding first means the caller never reaches that throw: it starts fresh.
    expect(isSkirmishRoundResumable(units(["b1", "B"]), state)).toBe(false);
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

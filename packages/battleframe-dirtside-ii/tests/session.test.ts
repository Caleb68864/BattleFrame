import { describe, expect, it } from "vitest";
import {
  createDirtsideRound,
  restoreDirtsideRound,
  firstChooser,
  IllegalActivationError,
  type DirtsideUnit,
} from "../src/round/session";

const units = (...specs: Array<[string, string]>): DirtsideUnit[] =>
  specs.map(([id, playerId]) => ({ id, playerId }));

/**
 * A10 — one round of alternating UNIT activation (the iteration is over
 * dirtside-ii.unit grouping actors; fire later resolves elements). Two DSII
 * additions over the base skirmish loop: the side with FEWER units on the table
 * chooses who goes first, and a side may PASS only while it has fewer
 * un-activated units than the opponent.
 */

describe("firstChooser — fewer units on the table chooses first", () => {
  it("returns the player with fewer units", () => {
    expect(firstChooser(units(["a1", "A"], ["a2", "A"], ["b1", "B"]))).toBe("B");
  });

  it("returns null on an equal count (caller rolls off)", () => {
    expect(firstChooser(units(["a1", "A"], ["b1", "B"]))).toBeNull();
  });

  it("ignores destroyed units when counting", () => {
    const roster: DirtsideUnit[] = [
      { id: "a1", playerId: "A" },
      { id: "a2", playerId: "A", isDestroyed: () => true },
      { id: "b1", playerId: "B" },
    ];
    // A has 1 live unit, B has 1 → tie → null
    expect(firstChooser(roster)).toBeNull();
  });
});

describe("createDirtsideRound — alternating unit activation (inherited base loop)", () => {
  it("alternates starting with the first player and skips an exhausted side", () => {
    const round = createDirtsideRound(units(["a1", "A"], ["a2", "A"], ["b1", "B"]), "A");
    expect(round.activePlayerId()).toBe("A");
    round.activate("a1");
    expect(round.activePlayerId()).toBe("B");
    round.activate("b1"); // B exhausted
    expect(round.activePlayerId()).toBe("A"); // A continues
    round.activate("a2");
    expect(round.isComplete()).toBe(true);
  });

  it("refuses out-of-turn, repeat, and unknown activations", () => {
    const round = createDirtsideRound(units(["a1", "A"], ["b1", "B"]), "A");
    expect(() => round.activate("b1")).toThrow(IllegalActivationError);
    round.activate("a1");
    expect(() => round.activate("a1")).toThrow(IllegalActivationError);
    expect(() => round.activate("ghost")).toThrow(IllegalActivationError);
  });
});

describe("pass rule — legal only when you have fewer un-activated units", () => {
  it("lets the outnumbered side pass, yielding the turn without activating", () => {
    // A: 1 unit, B: 3 units. A is outnumbered → A may pass.
    const round = createDirtsideRound(
      units(["a1", "A"], ["b1", "B"], ["b2", "B"], ["b3", "B"]),
      "A"
    );
    expect(round.canPass("A")).toBe(true);
    round.pass("A");
    expect(round.isActivated("a1")).toBe(false); // no unit spent
    expect(round.activePlayerId()).toBe("B"); // turn yielded
  });

  it("forbids passing when you do NOT have fewer un-activated units", () => {
    // B has more units, so B can never pass.
    const round = createDirtsideRound(
      units(["a1", "A"], ["b1", "B"], ["b2", "B"]),
      "A"
    );
    round.activate("a1"); // now A:0, B:2 → B's turn, B not outnumbered
    expect(round.canPass("B")).toBe(false);
    expect(() => round.pass("B")).toThrow(IllegalActivationError);
  });

  it("forbids passing out of turn", () => {
    const round = createDirtsideRound(units(["a1", "A"], ["b1", "B"], ["b2", "B"]), "A");
    // It is A's turn; B cannot pass now.
    expect(() => round.pass("B")).toThrow(IllegalActivationError);
  });

  it("serialize/restore round-trips activation and turn state across a pass", () => {
    const roster = units(["a1", "A"], ["b1", "B"], ["b2", "B"]);
    const round = createDirtsideRound(roster, "A");
    round.activate("a1"); // A exhausted; B's turn
    const restored = restoreDirtsideRound(roster, round.serialize());
    expect(restored.activePlayerId()).toBe("B");
    expect(restored.isActivated("a1")).toBe(true);
    restored.activate("b1");
    restored.activate("b2");
    expect(restored.isComplete()).toBe(true);
  });
});

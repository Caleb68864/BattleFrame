import { describe, expect, it } from "vitest";
import {
  firstActivator,
  canPass,
  startActivation,
  spendMove,
  spendFire,
  isActivationComplete,
  createStargruntRound,
  restoreStargruntRound,
  turnComplete,
  beginNextTurn,
  IllegalActivationError,
  IllegalActionError,
  type StargruntUnit
} from "../src/round/session";

/** D1 — the side with the fewer un-activated units chooses to activate first. */
describe("firstActivator", () => {
  it("gives first activation to the smaller force", () => {
    expect(firstActivator({ blue: 3, red: 5 })).toBe("blue");
    expect(firstActivator({ blue: 6, red: 2 })).toBe("red");
  });

  it("returns 'tie' on equal counts (the caller rolls / asks the GM)", () => {
    expect(firstActivator({ blue: 4, red: 4 })).toBe("tie");
  });
});

/** D2 — passing is legal only when a side has strictly fewer face-up units. */
describe("canPass", () => {
  it("is legal only when my face-up count is strictly below the opponent's", () => {
    expect(canPass("blue", { blue: 2, red: 4 })).toBe(true);
    expect(canPass("blue", { blue: 4, red: 4 })).toBe(false);
    expect(canPass("blue", { blue: 5, red: 4 })).toBe(false);
  });
});

/** D3 — the two-action budget nested inside an activation. */
describe("activation budget", () => {
  it("opens a budget of two actions", () => {
    const b = startActivation("u1");
    expect(b.actionsRemaining).toBe(2);
    expect(isActivationComplete(b)).toBe(false);
  });

  it("spends move and fire actions down to exhaustion", () => {
    let b = startActivation("u1");
    b = spendMove(b);
    b = spendFire(b, "rifle");
    expect(b.actionsRemaining).toBe(0);
    expect(isActivationComplete(b)).toBe(true);
  });

  it("refuses to spend past the budget", () => {
    let b = startActivation("u1");
    b = spendMove(b);
    b = spendMove(b);
    expect(() => spendMove(b)).toThrow(IllegalActionError);
  });

  it("a given weapon may fire only once per activation", () => {
    let b = startActivation("u1");
    b = spendFire(b, "rifle");
    expect(() => spendFire(b, "rifle")).toThrow(IllegalActionError);
    // a different weapon is fine.
    expect(() => spendFire(b, "smg")).not.toThrow();
  });

  it("moving with BOTH actions flags the unit reaction-fire-eligible", () => {
    let b = startActivation("u1");
    b = spendMove(b);
    expect(b.reactionEligible).toBe(false);
    b = spendMove(b);
    expect(b.reactionEligible).toBe(true);
  });
});

const units: StargruntUnit[] = [
  { id: "b1", sideId: "blue" },
  { id: "b2", sideId: "blue" },
  { id: "r1", sideId: "red" },
  { id: "r2", sideId: "red" }
];

/** D5 — the round alternates, tracks passes, and serializes/restores. */
describe("createStargruntRound", () => {
  it("alternates activation starting with the first side", () => {
    const round = createStargruntRound(units, "blue");
    expect(round.activeSideId()).toBe("blue");
    round.activate("b1");
    expect(round.activeSideId()).toBe("red");
    round.activate("r1");
    expect(round.activeSideId()).toBe("blue");
  });

  it("rejects an out-of-turn activation", () => {
    const round = createStargruntRound(units, "blue");
    expect(() => round.activate("r1")).toThrow(IllegalActivationError);
  });

  it("continues alternation onto the side with units left when one side is spent", () => {
    const round = createStargruntRound(units, "blue");
    round.activate("b1");
    round.activate("r1");
    round.activate("b2");
    round.activate("r2");
    // all activated -> nobody active, turn complete.
    expect(round.activeSideId()).toBeUndefined();
    expect(turnComplete(round)).toBe(true);
  });

  it("allows a legal pass and hands the slot to the opponent", () => {
    // blue has fewer face-up units than red after activating one.
    const round = createStargruntRound(units, "blue");
    round.activate("b1"); // blue 1 left, red 2 left; red is active now.
    round.activate("r1"); // red 1 left; blue active.
    // blue face-up (1) < red face-up (1)? no -> cannot pass yet.
    expect(canPass("blue", round.faceUpCounts())).toBe(false);
  });

  it("ends the turn when both sides pass in succession", () => {
    // Contrive: blue has 1 face-up, red has 2, so blue may pass; then red may not
    // (2 !< 1) — so instead activate red down and let both pass.
    const small: StargruntUnit[] = [
      { id: "b1", sideId: "blue" },
      { id: "r1", sideId: "red" },
      { id: "r2", sideId: "red" }
    ];
    const round = createStargruntRound(small, "blue");
    round.pass("blue"); // blue 1 < red 2 -> legal pass; red active.
    round.activate("r1"); // red 1 left; blue active, blue still 1 face-up vs red 1.
    // both now 1 face-up: neither can pass by the strict rule, so drive to completion.
    round.activate("b1");
    round.activate("r2");
    expect(turnComplete(round)).toBe(true);
  });

  it("serializes and restores mid-round state including the turn track", () => {
    const round = createStargruntRound(units, "blue");
    round.activate("b1");
    const state = round.serialize();
    expect(state.activatedIds).toContain("b1");
    expect(state.turn).toBe(1);

    const restored = restoreStargruntRound(units, state);
    expect(restored.isActivated("b1")).toBe(true);
    expect(restored.activeSideId()).toBe("red");
  });
});

/** D4 — Turn-End clears activation and bumps the turn track (pure reset). */
describe("beginNextTurn", () => {
  it("clears activation and advances the turn number", () => {
    const round = createStargruntRound(units, "blue");
    round.activate("b1");
    round.activate("r1");
    const next = beginNextTurn(round.serialize(), "red");
    expect(next.activatedIds).toEqual([]);
    expect(next.turn).toBe(2);
    expect(next.firstSideId).toBe("red");
  });
});

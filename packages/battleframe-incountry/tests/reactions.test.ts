import { describe, expect, it } from "vitest";
import {
  canReact,
  resolveCounterattack,
  type CounterShot
} from "../src/round/reactions";

/**
 * Reactions (rulebook E). A unit reacts only with a Reaction token AND a weapon
 * that has an overwatch/react profile. In a COUNTERATTACK, the original attacker
 * and every counter-attacking reactor roll simultaneously; shots resolve highest
 * hit-total first, and a shooter destroyed by a STRICTLY HIGHER roll has its own
 * shot discarded. Equal totals are simultaneous -- mutual kills both land.
 */

describe("canReact", () => {
  it("needs both a reaction token and a react-capable weapon", () => {
    expect(canReact(true, true)).toBe(true);
    expect(canReact(false, true)).toBe(false);
    expect(canReact(true, false)).toBe(false);
  });
});

function shot(id: string, attackTotal: number, targetId: string, destroysTarget: boolean): CounterShot {
  return { shooterId: id, attackTotal, targetId, destroysTarget };
}

describe("resolveCounterattack — highest total first, discard-on-death", () => {
  it("a higher roll destroys a lower shooter before it fires, discarding its shot", () => {
    // Reactor R (total 8) kills the original attacker A (total 5) first, so A's
    // attack is discarded.
    const outcome = resolveCounterattack([
      shot("A", 5, "R", true),
      shot("R", 8, "A", true)
    ]);
    expect(outcome.resolved.map((s) => s.shooterId)).toEqual(["R"]);
    expect(outcome.discarded.map((s) => s.shooterId)).toEqual(["A"]);
  });

  it("keeps a shot when the shooter survives the higher rolls", () => {
    const outcome = resolveCounterattack([
      shot("A", 9, "R", false), // A is highest but does not destroy R
      shot("R", 4, "A", true) // R still resolves because A did not kill it
    ]);
    expect(outcome.resolved.map((s) => s.shooterId).sort()).toEqual(["A", "R"]);
    expect(outcome.discarded).toEqual([]);
  });

  it("equal totals are simultaneous — mutual kills both land", () => {
    const outcome = resolveCounterattack([
      shot("A", 6, "R", true),
      shot("R", 6, "A", true)
    ]);
    // Neither is a STRICTLY higher roll, so both resolve.
    expect(outcome.resolved.map((s) => s.shooterId).sort()).toEqual(["A", "R"]);
    expect(outcome.discarded).toEqual([]);
  });

  it("orders three shooters by descending total and cascades discards", () => {
    // C(9) kills B; B(7) would have killed A; A(5) fires last.
    // Processing order 9,7,5: C resolves & kills B; B is dead -> discarded;
    // A survives (only B targeted A, and B was discarded) -> resolves.
    const outcome = resolveCounterattack([
      shot("A", 5, "C", false),
      shot("B", 7, "A", true),
      shot("C", 9, "B", true)
    ]);
    expect(outcome.resolved.map((s) => s.shooterId)).toEqual(["C", "A"]);
    expect(outcome.discarded.map((s) => s.shooterId)).toEqual(["B"]);
  });
});

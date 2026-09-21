import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoundSession, type RoundSessionKnight } from "../src/round/session";
import { toVictoryKnights } from "../src/ui/round-control";
import { checkVictory } from "../src/round/victory";
import { isKnightRemoved } from "../src/round/removal";
import type { ActorLike } from "../src/round/loop";
import type { DiceApiLike, MeasureApiLike } from "../src/combat/clash";
import type { DieFace } from "../src/constants";
import { SCENARIO_PROFILE, withScenarioProfile } from "./helpers/world";

// This module ships no rules numbers. Tests install a world carrying an
// invented profile, the way a user fills one in -- see helpers/world.ts.
let restoreGreathelmWorld: () => void;
beforeEach(() => {
  restoreGreathelmWorld = withScenarioProfile();
});
afterEach(() => {
  restoreGreathelmWorld();
});


/**
 * The pieces of a GREATHELM round are unit-tested one at a time -- dice pool,
 * clash, damage, removal, courage, victory. This drives them together, once,
 * the way a played round does: spend the descending steps in order, resolve a
 * clash that wounds a knight to removal, let the session complete into the
 * courage phase, then read the victory. Every "correct pieces, broken whole"
 * bug this project has hit (courage difficulty seeded at 0, victory handed
 * knights with no isRemoved) was invisible to the unit tests and would have
 * shown here.
 */

function makeActor(initialDamage = 0): ActorLike & { system: { damage: number } } {
  const actor = {
    system: { damage: initialDamage },
    flags: {} as Record<string, Record<string, unknown> | undefined>,
    async update(data: Record<string, unknown>) {
      const next = data["system.damage"];
      if (typeof next === "number") {
        actor.system.damage = next;
      }
    },
  };
  return actor;
}

/** Base contact for the declared pairs, a wide gap otherwise. */
function makeMeasure(adjacent: ReadonlyArray<[string, string]>): MeasureApiLike {
  const idOf = (t: unknown) => (t as { id: string }).id;
  return {
    between(a, b) {
      const near = adjacent.some(
        ([x, y]) => (x === idOf(a) && y === idOf(b)) || (x === idOf(b) && y === idOf(a))
      );
      return { distance: near ? 0 : 100 };
    },
  };
}

/** Both sides roll `total`; attacker wins ties, so total=6 makes the attacker win. */
function fixedDice(total = 6): DiceApiLike {
  return { async roll() { return { total }; } };
}

function sessionKnight(id: string, playerId: string, actor: ReturnType<typeof makeActor>): RoundSessionKnight {
  return { id, playerId, actor, token: { id }, isRemoved: () => isKnightRemoved(actor) };
}

function pool(...faces: DieFace[]) {
  return faces.map((face) => ({ face }));
}

describe("a GREATHELM round, end to end", () => {
  it("resolves a Heavy clash that removes the last enemy and hands the game to the winner", async () => {
    const a1Actor = makeActor(0);
    const b1Actor = makeActor(2); // one Heavy hit (2 damage) from the removal cap of 3
    const knights = [sessionKnight("a1", "a", a1Actor), sessionKnight("b1", "b", b1Actor)];

    const pools = new Map([
      ["a", pool(1)], // Heavy melee (face 1)
      ["b", pool(3)], // Shift (face 3) -- outranks the Heavy, so it is spent first
    ]);
    const session = createRoundSession({
      knights,
      pools,
      firstPlayerId: "a",
      dice: fixedDice(6),
      measure: makeMeasure([["a1", "b1"]]),
    });

    // 6->1 is global: b's face-3 Shift outranks a's face-1 Heavy, so b acts first
    // even though a won initiative.
    expect(session.activePlayerId()).toBe("b");
    await session.spendDie("b-d1", "b1");

    // Now the Heavy is the current step. a resolves the clash against b1.
    expect(session.activePlayerId()).toBe("a");
    await session.spendDie("a-d1", "a1");

    // The clash landed 2 damage on an already-wounded knight: capped at 3, removed.
    expect(b1Actor.system.damage).toBe(3);
    expect(isKnightRemoved(b1Actor)).toBe(true);

    // Every die spent -> the session completed (the courage phase ran; no knight
    // qualified to test, and that is fine -- the round still resolves).
    expect(session.isComplete()).toBe(true);
    expect(session.courageOutcomes()).toBeDefined();

    // b has no knights left in the play area; a wins. This is the full wiring:
    // clash -> persisted damage -> isKnightRemoved -> toVictoryKnights -> checkVictory.
    expect(checkVictory(toVictoryKnights(knights))).toEqual({ result: "winner", playerId: "a" });
  });

  it("keeps the game going when a clash wounds but does not remove", async () => {
    const a1Actor = makeActor(0);
    const b1Actor = makeActor(0); // healthy: one Light hit leaves it at 1, still in play
    const knights = [sessionKnight("a1", "a", a1Actor), sessionKnight("b1", "b", b1Actor)];

    const pools = new Map([
      ["a", pool(2)], // Light melee (face 2, 1 damage)
      ["b", pool(2)], // Light melee too -- same step, alternate
    ]);
    const session = createRoundSession({
      knights,
      pools,
      firstPlayerId: "a",
      dice: fixedDice(6),
      measure: makeMeasure([["a1", "b1"]]),
    });

    await session.spendDie("a-d1", "a1"); // a attacks b1 -> 1 damage
    await session.spendDie("b-d1", "b1"); // b attacks a1 -> 1 damage

    expect(a1Actor.system.damage).toBe(1);
    expect(b1Actor.system.damage).toBe(1);
    expect(session.isComplete()).toBe(true);

    // Both sides still hold the field: the game continues, no winner declared.
    expect(checkVictory(toVictoryKnights(knights))).toEqual({ result: "continue" });
  });
});

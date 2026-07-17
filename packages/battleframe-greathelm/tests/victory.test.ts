import { describe, expect, it } from "vitest";

import { actionHint } from "../src/round/action-hints";
import { checkVictory } from "../src/round/victory";
import type { CheckVictoryKnight } from "../src/round/victory";

function knight(playerId: string, removed = false): CheckVictoryKnight {
  return { playerId, isRemoved: () => removed };
}

describe("checkVictory — QSR p2 'round and game ends'", () => {
  it("declares a winner when only one player has knights left", () => {
    expect(
      checkVictory([knight("a"), knight("b", true), knight("b", true)])
    ).toEqual({ result: "winner", playerId: "a" });
  });

  it("continues while both sides still have a knight", () => {
    expect(
      checkVictory([knight("a"), knight("a", true), knight("b")])
    ).toEqual({ result: "continue" });
  });

  it("a single surviving knight on one side is still a win", () => {
    const knights = [
      knight("a", true), knight("a", true), knight("a"),
      knight("b", true), knight("b", true), knight("b", true)
    ];

    expect(checkVictory(knights)).toEqual({ result: "winner", playerId: "a" });
  });

  it("treats a knight with no isRemoved as in play (matching RoundSessionKnight)", () => {
    expect(checkVictory([{ playerId: "a" }, { playerId: "b" }])).toEqual({
      result: "continue"
    });
  });

  it("does NOT invent a draw when both sides are wiped out", () => {
    // QSR v0.4 says "only one player has knights remaining" -- a mutual
    // wipe-out is not that, and the rulebook does not say what it is. Guessing
    // "draw" would be presenting an invented rule as GREATHELM's.
    expect(
      checkVictory([knight("a", true), knight("b", true)])
    ).toEqual({ result: "mutual-elimination-unresolved" });
  });

  it("an empty board is unresolved, not a win for nobody", () => {
    expect(checkVictory([])).toEqual({ result: "mutual-elimination-unresolved" });
  });

  it("handles more than two players — three sides alive continues", () => {
    expect(
      checkVictory([knight("a"), knight("b"), knight("c")])
    ).toEqual({ result: "continue" });
  });

  it("re-queries isRemoved rather than caching it", () => {
    let removed = false;
    const knights: CheckVictoryKnight[] = [
      { playerId: "a" },
      { playerId: "b", isRemoved: () => removed }
    ];

    expect(checkVictory(knights)).toEqual({ result: "continue" });
    removed = true;
    expect(checkVictory(knights)).toEqual({ result: "winner", playerId: "a" });
  });
});

describe("actionHint — rules numbers come from constants, never the language file", () => {
  // The localizer is injected so these assert the DATA passed for interpolation,
  // which is the thing that must not drift from constants.ts.
  function capture() {
    const seen: { key?: string; data?: Record<string, number> } = {};
    const localize = (key: string, data?: Record<string, number>) => {
      seen.key = key;
      seen.data = data;

      return key;
    };

    return { seen, localize };
  }

  it("sprint carries its documented move and momentum", () => {
    const { seen, localize } = capture();
    actionHint("sprint", localize);

    expect(seen.key).toBe("battleframe-greathelm.actionHint.sprint");
    expect(seen.data).toEqual({ move: 5, momentum: 2 });
  });

  it("light and heavy carry damage, not movement", () => {
    const light = capture();
    actionHint("light", light.localize);
    expect(light.seen.data).toEqual({ damage: 1 });

    const heavy = capture();
    actionHint("heavy", heavy.localize);
    expect(heavy.seen.data).toEqual({ damage: 2 });
  });

  it("bash carries the defender shove distance", () => {
    const { seen, localize } = capture();
    actionHint("bash", localize);

    expect(seen.data).toEqual({ move: 3 });
  });

  it("every action has a hint — a die with no explanation is the bug this prevents", () => {
    const actions = ["sprint", "encircle", "bash", "shift", "light", "heavy"] as const;

    for (const action of actions) {
      const { seen, localize } = capture();
      actionHint(action, localize);

      expect(seen.key).toBe(`battleframe-greathelm.actionHint.${action}`);
      expect(Object.keys(seen.data ?? {}).length).toBeGreaterThan(0);
    }
  });
});

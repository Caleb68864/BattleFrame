import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginRound,
  buildCombatReportHtml,
  buildVictoryHtml,
  resolveActivation,
  _resetActiveRoundForTests,
  type RoundControlUnit
} from "../src/ui/round-control";
import type { AttackApplied } from "../src/combat/attack";
import type { DiceApiLike } from "../src/combat/resolve";
import type { VictoryOutcome } from "../src/round/victory";

afterEach(() => {
  vi.unstubAllGlobals();
  _resetActiveRoundForTests();
});

/** A resolved (applied) attack outcome for the card builders to render. */
function applied(over: Partial<AttackApplied> = {}): AttackApplied {
  return {
    attackerRolls: [],
    hits: 0,
    defenderRolls: [],
    casualties: 0,
    modelsRemoved: 0,
    destroyed: false,
    ...over
  };
}

function scriptedDice(faces: readonly number[]): DiceApiLike {
  let i = 0;
  return { async roll() { return { total: faces[i++] ?? 1 }; } };
}

function unit(id: string, playerId: string, system: Record<string, unknown>): RoundControlUnit {
  const actor = {
    system: { models: 3, move: 6, ...system },
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") (actor.system as { models: number }).models = next;
    }
  };
  return { id, playerId, token: { id }, actor };
}

describe("buildCombatReportHtml -- persistent combat-outcome card", () => {
  const names = { attacker: "Blue Spearmen", defender: "Red Skeletons", type: "melee" as const };

  it("wraps the neutral card container with the ss accent class", () => {
    const html = buildCombatReportHtml(applied({ hits: 2, modelsRemoved: 1 }), names);
    expect(html).toContain("battleframe-card");
    expect(html).toContain("ss-combat-report");
  });

  it("names both combatants and reports the hits and models removed", () => {
    const html = buildCombatReportHtml(applied({ hits: 3, modelsRemoved: 2 }), names);
    expect(html).toContain("Blue Spearmen");
    expect(html).toContain("Red Skeletons");
    expect(html).toContain("3");
    expect(html).toContain("2");
  });

  it("announces destruction when the defender is wiped out", () => {
    const alive = buildCombatReportHtml(applied({ hits: 1, modelsRemoved: 1, destroyed: false }), names);
    expect(alive.toLowerCase()).not.toContain("destroyed");

    const dead = buildCombatReportHtml(applied({ hits: 3, modelsRemoved: 3, destroyed: true }), names);
    expect(dead.toLowerCase()).toContain("destroyed");
  });

  it("HTML-escapes unit names (they are user-editable)", () => {
    const html = buildCombatReportHtml(applied({ hits: 1, modelsRemoved: 0 }), {
      attacker: "<img src=x onerror=alert(1)>",
      defender: "Bob & \"Co\"",
      type: "ranged"
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });
});

describe("buildVictoryHtml -- persistent round-over card", () => {
  it("carries the ss-victory accent class on the neutral card", () => {
    const html = buildVictoryHtml({ result: "winner", playerId: "friendly" });
    expect(html).toContain("battleframe-card");
    expect(html).toContain("ss-victory");
  });

  it("names the winning side", () => {
    const html = buildVictoryHtml({ result: "winner", playerId: "friendly" });
    expect(html).toContain("friendly");
    expect(html.toLowerCase()).toContain("win");
  });

  it("HTML-escapes the winning side name", () => {
    const html = buildVictoryHtml({ result: "winner", playerId: "<b>hax</b>" });
    expect(html).not.toContain("<b>hax</b>");
    expect(html).toContain("&lt;b&gt;hax");
  });

  it("reports a draw and a continue distinctly", () => {
    const draw: VictoryOutcome = { result: "draw" };
    const cont: VictoryOutcome = { result: "continue" };
    expect(buildVictoryHtml(draw).toLowerCase()).toContain("draw");
    expect(buildVictoryHtml(cont).toLowerCase()).toContain("field");
  });
});

describe("resolveActivation posts persistent chat cards through the postCard seam", () => {
  it("posts a combat-report card for a resolved attack", async () => {
    const a1 = unit("a1", "a", { attackMelee: 4 });
    const b1 = unit("b1", "b", { save: 5 });
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice: scriptedDice([6, 2]) }); // a first

    const cards: Array<{ cssClass?: string }> = [];
    await resolveActivation({
      round,
      attacker: a1,
      target: b1,
      type: "melee",
      dice: scriptedDice([4, 4, 2, 3, 6]),
      units,
      postCard: (spec) => { cards.push(spec); }
    });

    expect(cards.some((c) => c.cssClass === "ss-combat-report")).toBe(true);
  });

  it("posts a round-over victory card when the round ends", async () => {
    const a1 = unit("a1", "a", { attackMelee: 2 });
    const b1 = unit("b1", "b", { save: null, models: 2 });
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice: scriptedDice([6, 2]) }); // a first

    const cards: Array<{ cssClass?: string }> = [];
    await resolveActivation({
      round,
      attacker: a1,
      target: b1,
      type: "melee",
      dice: scriptedDice([2, 5, 6]), // wipes b1
      units,
      postCard: (spec) => { cards.push(spec); }
    });

    expect(cards.some((c) => c.cssClass === "ss-combat-report")).toBe(true);
    expect(cards.some((c) => c.cssClass === "ss-victory")).toBe(true);
  });

  it("does not throw when no postCard seam is supplied (default no-op)", async () => {
    const a1 = unit("a1", "a", { attackMelee: 4 });
    const b1 = unit("b1", "b", { save: 5 });
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice: scriptedDice([6, 2]) });

    await expect(
      resolveActivation({ round, attacker: a1, target: b1, type: "melee", dice: scriptedDice([4, 4, 2, 3, 6]), units })
    ).resolves.toBeDefined();
  });
});

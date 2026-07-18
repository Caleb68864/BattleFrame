import { beforeEach, describe, expect, it, vi } from "vitest";
import { rulesetRegistry } from "../../src/rulesets/registry";
import type { RulesetDefinition } from "../../src/rulesets/types";
import { createDiceApi } from "../../src/dice/dice";
import { between } from "../../src/measurement/measure";
import { getOrder, orderedCombatants } from "../../src/combat/battleframe-combat";
import type { CombatLike, CombatantLike } from "../../src/combat/types";
import { gridlessScene, makeFixtureToken, PX_PER_UNIT } from "../fixtures/known-distances";

/**
 * A synthetic ruleset defined entirely in this test file -- never imported
 * from the GREATHELM ruleset package. It proves the public seams (registry,
 * dice, measurement, combat order flags, chat) suffice to host a ruleset
 * without core importing one. This is deliberately not a literal "full
 * round" test against that ruleset -- see SS-12 acceptance criteria for why
 * that would trip neutrality instead of proving it.
 */
function syntheticRulesetDefinition(): RulesetDefinition {
  return {
    id: "synthetic-seam-ruleset",
    title: "Synthetic Seam Ruleset",
    version: "1.0.0",
    battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
    primary: true,
  };
}

class MockRoll {
  formula: string;
  total = 0;

  constructor(formula: string, public data?: Record<string, unknown>) {
    this.formula = formula;
  }

  async evaluate(): Promise<this> {
    // Deterministic stand-in for a die read -- never Math.random(), so
    // Dice So Nice integration is never defeated even in the real roll path.
    this.total = 6;
    return this;
  }
}

beforeEach(() => {
  vi.stubGlobal("Roll", MockRoll);
  vi.stubGlobal("Handlebars", {
    compile: (template: string) => (data: Record<string, unknown>) =>
      template.replace(/{{\s*(\w+)\s*}}/g, (_match, key) => String(data[key] ?? "")),
  });
  vi.stubGlobal("ChatMessage", { create: vi.fn(async () => undefined) });
  vi.spyOn(console, "debug").mockImplementation(() => {});
});

function makeCombatant(id: string): CombatantLike {
  return { id, initiative: null };
}

describe("seam: synthetic ruleset can register, activate, roll, order, measure, and post to chat", () => {
  it("exercises the full seam using only battleframe's public API", async () => {
    const definition = syntheticRulesetDefinition();

    const registerResult = rulesetRegistry.registerRuleset(definition);
    expect(registerResult).toEqual({ ok: true });

    const activateResult = rulesetRegistry.activateRuleset(definition.id);
    expect(activateResult).toEqual({ ok: true });
    expect(rulesetRegistry.getActiveRuleset()?.id).toBe(definition.id);

    const dice = createDiceApi();
    const poolSize = 4;
    const rolls = await Promise.all(
      Array.from({ length: poolSize }, () =>
        dice.roll("1d6", undefined, { rulesetId: definition.id })
      )
    );
    expect(rolls).toHaveLength(poolSize);
    expect(rolls.every((r) => r.total === 6)).toBe(true);

    const combatants = [makeCombatant("knight-a"), makeCombatant("knight-b")];
    const combat: CombatLike = {
      combatants,
      flags: { battleframe: { order: ["knight-b", "knight-a"] } },
    };
    expect(getOrder(combat)).toEqual(["knight-b", "knight-a"]);
    expect(orderedCombatants(combat).map((c) => c.id)).toEqual(["knight-b", "knight-a"]);

    const tokenA = makeFixtureToken({ x: 0, y: 0, widthMm: 25.4 });
    const tokenB = makeFixtureToken({ x: 5 * PX_PER_UNIT, y: 0, widthMm: 25.4 });
    const measurement = between(tokenA, tokenB);
    expect(measurement.mode).toBe("base-to-base");
    expect(measurement.units).toBe(gridlessScene.grid.units);
    expect(measurement.distance).toBeCloseTo(5 - 1, 10);

    const chatMessage = (globalThis as unknown as {
      ChatMessage: { create: ReturnType<typeof vi.fn> };
    }).ChatMessage;
    expect(chatMessage.create).toHaveBeenCalledTimes(poolSize);
  });
});

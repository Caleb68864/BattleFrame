import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRulesetDefinition } from "../src/rulesets/validate";
import type { RulesetDefinition } from "../src/rulesets/types";

function definition(minimum: string): RulesetDefinition {
  return {
    id: "core-ruleset",
    title: "Core Ruleset",
    version: "1.0.0",
    battleframeCompatibility: { minimum, verified: minimum },
    primary: true,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("validateRulesetDefinition version check", () => {
  it("asks Foundry's isNewerVersion rather than comparing versions itself", () => {
    // Deliberately answers against the arithmetic, so only a real delegation passes.
    const isNewerVersion = vi.fn(() => true);
    vi.stubGlobal("foundry", { utils: { isNewerVersion } });

    const errors = validateRulesetDefinition(definition("0.0.1"), [], "9.9.9");

    expect(isNewerVersion).toHaveBeenCalledWith("0.0.1", "9.9.9");
    expect(errors.some((e) => e.includes("requires battleframe"))).toBe(true);
  });

  it("accepts the ruleset when Foundry says the minimum is not newer", () => {
    vi.stubGlobal("foundry", { utils: { isNewerVersion: () => false } });

    expect(validateRulesetDefinition(definition("99.0.0"), [], "1.0.0")).toEqual([]);
  });
});

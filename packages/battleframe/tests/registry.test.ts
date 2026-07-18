import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RulesetRegistry } from "../src/rulesets/registry";
import type { RulesetDefinition } from "../src/rulesets/types";

function makeDefinition(overrides: Partial<RulesetDefinition> = {}): RulesetDefinition {
  return {
    id: "core-ruleset",
    title: "Core Ruleset",
    version: "1.0.0",
    battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
    primary: true,
    ...overrides,
  };
}

describe("RulesetRegistry", () => {
  let registry: RulesetRegistry;

  beforeEach(() => {
    registry = new RulesetRegistry();
  });

  it("registers a valid ruleset and does not throw", () => {
    const result = registry.registerRuleset(makeDefinition());
    expect(result).toEqual({ ok: true });
  });

  it("rejects a duplicate id with an actionable error", () => {
    registry.registerRuleset(makeDefinition());
    const result = registry.registerRuleset(makeDefinition({ title: "Duplicate" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((message) => message.includes("core-ruleset"))).toBe(true);
    }
  });

  it("rejects a minimum compatibility above the running system version without partial registration", () => {
    const result = registry.registerRuleset(
      makeDefinition({ battleframeCompatibility: { minimum: "99.0.0", verified: "99.0.0" } })
    );

    expect(result.ok).toBe(false);
    expect(registry.getRuleset("core-ruleset")).toBeNull();
  });

  it("does not activate on registration", () => {
    registry.registerRuleset(makeDefinition());
    expect(registry.getActiveRuleset()).toBeNull();
  });

  it("activates a ruleset only after activateRuleset is called", () => {
    registry.registerRuleset(makeDefinition());
    expect(registry.getActiveRuleset()).toBeNull();

    const result = registry.activateRuleset("core-ruleset");
    expect(result).toEqual({ ok: true });
    expect(registry.getActiveRuleset()?.id).toBe("core-ruleset");
  });

  it("allows two primary rulesets to register successfully", () => {
    const first = registry.registerRuleset(makeDefinition({ id: "alpha", primary: true }));
    const second = registry.registerRuleset(makeDefinition({ id: "beta", primary: true }));

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });

  it("surfaces the primary conflict at activation, not registration", () => {
    registry.registerRuleset(makeDefinition({ id: "alpha", primary: true }));
    registry.registerRuleset(makeDefinition({ id: "beta", primary: true }));

    const activateAlpha = registry.activateRuleset("alpha");
    expect(activateAlpha).toEqual({ ok: true });

    const activateBeta = registry.activateRuleset("beta");
    expect(activateBeta.ok).toBe(false);
  });
});

describe("RulesetRegistry hooks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires battleframe.rulesetRegistered on successful registration", () => {
    const callAll = vi.fn();
    vi.stubGlobal("Hooks", { callAll });

    const registry = new RulesetRegistry();
    registry.registerRuleset(makeDefinition());

    expect(callAll).toHaveBeenCalledWith("battleframe.rulesetRegistered", makeDefinition());
  });

  it("does not fire battleframe.rulesetRegistered when registration fails", () => {
    const callAll = vi.fn();
    vi.stubGlobal("Hooks", { callAll });

    const registry = new RulesetRegistry();
    registry.registerRuleset(makeDefinition());
    callAll.mockClear();
    registry.registerRuleset(makeDefinition({ title: "Duplicate" }));

    expect(callAll).not.toHaveBeenCalled();
  });

  it("fires battleframe.rulesetActivated on activation", () => {
    const callAll = vi.fn();
    vi.stubGlobal("Hooks", { callAll });

    const registry = new RulesetRegistry();
    registry.registerRuleset(makeDefinition());
    registry.activateRuleset("core-ruleset");

    expect(callAll).toHaveBeenCalledWith("battleframe.rulesetActivated", makeDefinition());
  });
});

describe("battleframe.ready hook", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires battleframe.ready once the Foundry ready hook resolves", async () => {
    const callAll = vi.fn();
    const handlers: Record<string, () => void> = {};
    vi.stubGlobal("Hooks", {
      once: (hook: string, callback: () => void) => {
        handlers[hook] = callback;
      },
      callAll,
    });
    vi.stubGlobal("game", {});

    vi.resetModules();
    await import("../src/hooks/index");

    handlers.ready();

    expect(callAll).toHaveBeenCalledWith("battleframe.ready");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_ID } from "../src/constants";
import { rulesetRegistry } from "../src/rulesets/registry";
import type { RulesetDefinition } from "../src/rulesets/types";
import {
  SETTING_ACTIVE_RULESET_ID,
  SETTING_DEFAULT_GRID_UNIT,
  SETTING_SETUP_COMPLETED,
  getActiveRulesetId,
  getDefaultGridUnit,
  isSetupCompleted,
  registerBattleframeSettings,
  setActiveRulesetId,
  setDefaultGridUnit,
  setSetupCompleted,
} from "../src/settings";
import {
  activatePrimarySelection,
  evaluateWizardState,
  shouldAutoOpenWizard,
} from "../src/applications/setup-wizard";

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

function makeFakeSettings() {
  const store = new Map<string, unknown>();
  const registered = new Map<string, Record<string, unknown>>();
  const menus = new Map<string, Record<string, unknown>>();

  return {
    store,
    registered,
    menus,
    register: vi.fn((namespace: string, key: string, data: Record<string, unknown>) => {
      registered.set(`${namespace}.${key}`, data);
      store.set(`${namespace}.${key}`, data.default);
    }),
    registerMenu: vi.fn((namespace: string, key: string, data: Record<string, unknown>) => {
      menus.set(`${namespace}.${key}`, data);
    }),
    get: vi.fn((namespace: string, key: string) => store.get(`${namespace}.${key}`)),
    set: vi.fn(async (namespace: string, key: string, value: unknown) => {
      store.set(`${namespace}.${key}`, value);
      return value;
    }),
  };
}

describe("battleframe settings", () => {
  let fakeSettings: ReturnType<typeof makeFakeSettings>;

  beforeEach(() => {
    fakeSettings = makeFakeSettings();
    (globalThis as unknown as { game?: unknown }).game = { settings: fakeSettings };
  });

  afterEach(() => {
    delete (globalThis as unknown as { game?: unknown }).game;
  });

  it("registers world settings for activeRulesetId, setupCompleted, and defaultGridUnit", () => {
    registerBattleframeSettings();

    expect(fakeSettings.registered.has(`${SYSTEM_ID}.${SETTING_ACTIVE_RULESET_ID}`)).toBe(true);
    expect(fakeSettings.registered.has(`${SYSTEM_ID}.${SETTING_SETUP_COMPLETED}`)).toBe(true);
    expect(fakeSettings.registered.has(`${SYSTEM_ID}.${SETTING_DEFAULT_GRID_UNIT}`)).toBe(true);

    const activeRulesetSetting = fakeSettings.registered.get(
      `${SYSTEM_ID}.${SETTING_ACTIVE_RULESET_ID}`
    );
    expect(activeRulesetSetting?.scope).toBe("world");

    const setupCompletedSetting = fakeSettings.registered.get(
      `${SYSTEM_ID}.${SETTING_SETUP_COMPLETED}`
    );
    expect(setupCompletedSetting?.scope).toBe("world");

    const gridUnitSetting = fakeSettings.registered.get(
      `${SYSTEM_ID}.${SETTING_DEFAULT_GRID_UNIT}`
    );
    expect(gridUnitSetting?.scope).toBe("world");
  });

  it("registers a settings menu entry when a wizard application class is supplied", () => {
    class FakeWizard {}
    registerBattleframeSettings(FakeWizard);

    expect(fakeSettings.menus.size).toBe(1);
  });

  it("defaults setupCompleted to false and activeRulesetId to empty before registration", () => {
    expect(isSetupCompleted()).toBe(false);
    expect(getActiveRulesetId()).toBeNull();
  });

  it("round-trips activeRulesetId, setupCompleted, and defaultGridUnit", async () => {
    registerBattleframeSettings();

    await setActiveRulesetId("core-ruleset");
    expect(getActiveRulesetId()).toBe("core-ruleset");

    await setSetupCompleted(true);
    expect(isSetupCompleted()).toBe(true);

    await setDefaultGridUnit("m");
    expect(getDefaultGridUnit()).toBe("m");
  });

  it("defaults defaultGridUnit to ft when unset", () => {
    expect(getDefaultGridUnit()).toBe("ft");
  });
});

describe("setup wizard state evaluation", () => {
  it("reports the empty state when zero rulesets are installed", () => {
    const result = evaluateWizardState([]);
    expect(result.state).toBe("empty");
  });

  it("lists each ruleset with title, version, and compatibility when ready", () => {
    const result = evaluateWizardState([
      makeDefinition({ id: "alpha", title: "Alpha", version: "2.1.0" }),
    ]);

    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.rulesets).toHaveLength(1);
      expect(result.rulesets[0]).toMatchObject({
        id: "alpha",
        title: "Alpha",
        version: "2.1.0",
      });
      expect(result.rulesets[0].compatibility).toContain("0.1.0");
    }
  });

  it("reports a conflict and names both rulesets when two are primary", () => {
    const result = evaluateWizardState([
      makeDefinition({ id: "alpha", primary: true }),
      makeDefinition({ id: "beta", primary: true }),
    ]);

    expect(result.state).toBe("conflict");
    if (result.state === "conflict") {
      expect(result.conflictingIds.sort()).toEqual(["alpha", "beta"]);
      expect(result.rulesets).toHaveLength(2);
    }
  });
});

describe("shouldAutoOpenWizard", () => {
  it("opens for a GM when setup is incomplete", () => {
    expect(shouldAutoOpenWizard(true, false)).toBe(true);
  });

  it("never opens for a player, even if setup is incomplete", () => {
    expect(shouldAutoOpenWizard(false, false)).toBe(false);
  });

  it("does not reopen automatically once setup is completed", () => {
    expect(shouldAutoOpenWizard(true, true)).toBe(false);
  });
});

describe("activatePrimarySelection ordering", () => {
  let fakeSettings: ReturnType<typeof makeFakeSettings>;

  beforeEach(() => {
    fakeSettings = makeFakeSettings();
    (globalThis as unknown as { game?: unknown }).game = { settings: fakeSettings };
    registerBattleframeSettings();
  });

  afterEach(() => {
    delete (globalThis as unknown as { game?: unknown }).game;
    (rulesetRegistry as unknown as { rulesets: Map<string, unknown> }).rulesets.clear();
    (rulesetRegistry as unknown as { activeId: string | null }).activeId = null;
  });

  it("calls activateRuleset before writing the activeRulesetId world setting", async () => {
    rulesetRegistry.registerRuleset(makeDefinition({ id: "core-ruleset" }));

    const setSpy = fakeSettings.set;
    const activateSpy = vi.spyOn(rulesetRegistry, "activateRuleset");

    const result = await activatePrimarySelection("core-ruleset");

    expect(result.ok).toBe(true);
    expect(activateSpy).toHaveBeenCalledWith("core-ruleset");

    const activateOrder = activateSpy.mock.invocationCallOrder[0];
    const setOrder = setSpy.mock.invocationCallOrder[0];
    expect(activateOrder).toBeLessThan(setOrder);

    expect(getActiveRulesetId()).toBe("core-ruleset");
  });

  it("does not write the activeRulesetId world setting when activation fails", async () => {
    const result = await activatePrimarySelection("nonexistent-ruleset");

    expect(result.ok).toBe(false);
    expect(fakeSettings.set).not.toHaveBeenCalled();
    expect(getActiveRulesetId()).toBeNull();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import {
  FIRE_ARCS,
  HULL_GRADES,
  MODULE_ID,
  SETTING_RULES_PROFILE,
  WEAPON_KINDS
} from "../src/constants";
import {
  BLANK_PROFILE,
  RulesProfileInvalidError,
  RulesProfileNotSetError,
  getRules,
  importRules,
  isRulesComplete,
  normalizeRules,
  registerRulesProfileSetting,
  requireRules,
  rulesTemplate
} from "../src/rules-profile";
import { beamDiceAtRange } from "../src/combat/beam";
import { SCENARIO_RULES, withNoRules, withRules } from "./helpers/world";

/**
 * The guard on the rules-content strip.
 *
 * This module shipped 147 Full Thrust constants in `constants.ts` -- the
 * per-die damage table, the FT2 threshold ladder, to-hit tables by range band,
 * every weapon range, and a points value -- plus runs of the rulebook quoted
 * verbatim in the comments. What matters now is not that the profile works, but
 * that **nothing quietly answers for it**: a fallback anywhere would put those
 * numbers back while the other 644 tests stayed green.
 */

let restoreWorld: (() => void) | undefined;

afterEach(() => {
  restoreWorld?.();
  restoreWorld = undefined;
});

describe("the profile ships blank", () => {
  it("registers with a default that can play nothing", () => {
    const registered: Record<string, unknown>[] = [];
    const globalScope = globalThis as unknown as { game?: unknown };
    const previous = globalScope.game;
    globalScope.game = {
      settings: {
        register: (_ns: string, _key: string, data: Record<string, unknown>) => {
          registered.push(data);
        },
        get: () => undefined,
        set: async () => undefined
      }
    };

    registerRulesProfileSetting();
    globalScope.game = previous;

    expect(registered).toHaveLength(1);
    expect(registered[0].default).toEqual(BLANK_PROFILE);
    expect(isRulesComplete(BLANK_PROFILE)).toBe(false);
  });

  it("carries every field, and every one of them empty", () => {
    const entries = Object.entries(BLANK_PROFILE);
    expect(entries.length).toBeGreaterThan(100);

    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        expect(value, key).toEqual([]);
      } else if (typeof value === "number") {
        expect(value, key).toBe(0);
      } else if (typeof value === "string") {
        expect(value, key).toBe("");
      } else {
        expect(Object.keys(value as object), key).toEqual([]);
      }
    }
  });

  it("reads as blank where there is no Foundry at all", () => {
    const globalScope = globalThis as unknown as { game?: unknown };
    const previous = globalScope.game;
    globalScope.game = undefined;
    try {
      expect(getRules()).toEqual(BLANK_PROFILE);
    } finally {
      globalScope.game = previous;
    }
  });
});

describe("play refuses rather than falling back", () => {
  it("will not resolve a beam in a world that entered no numbers", () => {
    restoreWorld = withNoRules();
    expect(() => beamDiceAtRange(3, 10)).toThrow(RulesProfileNotSetError);
  });

  it("says what is missing and where to fix it", () => {
    restoreWorld = withNoRules();
    expect(() => requireRules()).toThrow(/ships no rules numbers/);
    expect(() => requireRules()).toThrow(/module settings/);
  });

  it("refuses a profile that fills in the trimmings but not the die", () => {
    restoreWorld = withRules({ ...BLANK_PROFILE, salvoRangeMu: 24, kgunBandMu: 6 });
    expect(() => requireRules()).toThrow(RulesProfileNotSetError);
  });

  it("hands back the world's own numbers once entered", () => {
    restoreWorld = withRules();
    expect(requireRules().dieSize).toBe(SCENARIO_RULES.dieSize);
    expect(beamDiceAtRange(3, 1)).toBe(3);
  });

  it("reads a beam's reach from the world's band width, not a remembered one", () => {
    // Same beam, same distance, two worlds: the answer tracks the profile.
    restoreWorld = withRules({ ...SCENARIO_RULES, beamRangeBandMu: 10 });
    const narrow = beamDiceAtRange(3, 25);
    restoreWorld();

    restoreWorld = withRules({ ...SCENARIO_RULES, beamRangeBandMu: 30 });
    const wide = beamDiceAtRange(3, 25);

    expect(narrow).toBeLessThan(wide);
  });
});

describe("normalizeRules keeps only fields this module knows", () => {
  it("drops keys it has never heard of", () => {
    const profile = normalizeRules({ dieSize: 6, teleportRangeMu: 99 }) as Record<string, unknown>;
    expect(profile.dieSize).toBe(6);
    expect(profile.teleportRangeMu).toBeUndefined();
  });

  it("reads nonsense as empty rather than passing it through", () => {
    const profile = normalizeRules({
      dieSize: "six",
      thresholdKillOn: "6,5,4",
      variableHullGradePercent: 7
    });

    expect(profile.dieSize).toBe(0);
    expect(profile.thresholdKillOn).toEqual([]);
    expect(profile.variableHullGradePercent).toEqual({});
  });

  it("reads anything that is not an object as blank", () => {
    for (const bad of [null, undefined, 42, "profile", []]) {
      expect(normalizeRules(bad)).toEqual(BLANK_PROFILE);
    }
  });
});

describe("importing a profile", () => {
  it("stores one the module can read back", async () => {
    restoreWorld = withNoRules();
    await importRules({ ...SCENARIO_RULES, dieSize: 10 });
    expect(getRules().dieSize).toBe(10);
  });

  it("refuses something that is not a profile", async () => {
    restoreWorld = withNoRules();
    await expect(importRules("a profile, honest")).rejects.toThrow(RulesProfileInvalidError);
  });

  it("refuses one missing the fields every other number is read against", async () => {
    restoreWorld = withNoRules();
    await expect(importRules({ salvoRangeMu: 24 })).rejects.toThrow(/leaves out/);
  });
});

describe("the template says what to supply, not what to put", () => {
  it("offers every field, all empty", () => {
    const template = JSON.parse(rulesTemplate()) as Record<string, unknown>;
    expect(Object.keys(template)).toEqual(Object.keys(BLANK_PROFILE));

    const nonEmpty = Object.entries(template).filter(([, v]) => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") return v !== "";
      return Object.keys(v as object).length > 0;
    });
    expect(nonEmpty).toEqual([]);
  });
});

describe("the constants file carries no rules numbers", () => {
  /**
   * Blunt on purpose. The whole strip is undone by one
   * `export const SOMETHING = 6` landing back in that file, which is exactly
   * how 147 of them got there.
   */
  it("exports only identity, flags and vocabulary", async () => {
    const constants = (await import("../src/constants")) as Record<string, unknown>;
    expect(new Set(Object.keys(constants))).toEqual(
      new Set([
        "MODULE_ID",
        "SETTING_RULES_PROFILE",
        "SHIP_ACTOR_TYPE",
        "FIGHTER_GROUP_ACTOR_TYPE",
        "PLOTTED_ORDER_FLAG",
        "FIRE_PHASE_FLAG",
        "ACTIVE_MISSILES_FLAG",
        "HELD_FLAG",
        "WAVE_GUN_CHARGE_FLAG",
        "LAUNCHED_GROUPS_FLAG",
        "FIRE_ARCS",
        "WEAPON_KINDS",
        "HULL_GRADES"
      ])
    );
  });

  it("holds no number at all", async () => {
    const constants = (await import("../src/constants")) as Record<string, unknown>;
    const numbers = Object.entries(constants).filter(([, v]) => typeof v === "number");
    expect(numbers).toEqual([]);
  });

  it("keeps the three vocabularies as names, carrying no values", () => {
    for (const set of [FIRE_ARCS, WEAPON_KINDS, HULL_GRADES]) {
      expect(set.every((name) => typeof name === "string")).toBe(true);
    }
    expect(MODULE_ID).toBe("battleframe-full-thrust");
    expect(SETTING_RULES_PROFILE).toBe("rulesProfile");
  });
});

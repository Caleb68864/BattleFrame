import { afterEach, describe, expect, it } from "vitest";
import { ACTION_IDS, DIE_FACES, MODULE_ID, SETTING_RULES_PROFILE } from "../src/constants";
import {
  BLANK_PROFILE,
  RulesProfileInvalidError,
  RulesProfileNotSetError,
  getProfile,
  importProfile,
  isProfileComplete,
  normalizeProfile,
  profileTemplate,
  registerRulesProfileSetting,
  requireProfile
} from "../src/rules-profile";
import { describeAction, damageForAction } from "../src/round/actions";
import { TEST_PROFILE, withBlankProfile, withProfile } from "./helpers/world";

/**
 * The guard on the rules-content strip.
 *
 * This module shipped every GREATHELM number in `constants.ts` until the
 * rules-content audit. What matters now is not that the profile works, but
 * that **nothing quietly answers for it** -- a fallback anywhere on the path
 * would put the published values back in the repository while the rest of the
 * suite stayed green.
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
        get: () => undefined
      }
    };

    registerRulesProfileSetting();
    globalScope.game = previous;

    expect(registered).toHaveLength(1);
    expect(registered[0].default).toEqual(BLANK_PROFILE);
    expect(isProfileComplete(BLANK_PROFILE)).toBe(false);
  });

  it("carries no numbers and no mapping", () => {
    expect(BLANK_PROFILE.dicePoolPerKnightBonus).toBe(0);
    expect(BLANK_PROFILE.openingDicePoolSize).toBe(0);
    expect(BLANK_PROFILE.minDicePoolFloor).toBe(0);
    expect(Object.keys(BLANK_PROFILE.faceToAction)).toEqual([]);
    expect(BLANK_PROFILE.clashTestActions).toEqual([]);
    expect(Object.keys(BLANK_PROFILE.actions)).toEqual([]);
  });

  it("reads as blank where there is no Foundry at all", () => {
    const globalScope = globalThis as unknown as { game?: unknown };
    const previous = globalScope.game;
    globalScope.game = undefined;
    try {
      expect(getProfile()).toEqual(BLANK_PROFILE);
    } finally {
      globalScope.game = previous;
    }
  });
});

describe("play refuses rather than falling back", () => {
  it("will not describe an action in a world that entered no profile", () => {
    restoreWorld = withBlankProfile();
    expect(() => describeAction("sprint")).toThrow(RulesProfileNotSetError);
  });

  it("will not give a damage figure either", () => {
    restoreWorld = withBlankProfile();
    expect(() => damageForAction("heavy")).toThrow(RulesProfileNotSetError);
  });

  it("says what is missing and where to fix it", () => {
    restoreWorld = withBlankProfile();
    expect(() => requireProfile()).toThrow(/ships no rules numbers/);
    expect(() => requireProfile()).toThrow(/module settings/);
  });

  it("hands back the world's own numbers once entered", () => {
    restoreWorld = withProfile();
    expect(describeAction("sprint").moveInches).toBe(TEST_PROFILE.actions.sprint?.moveInches);
    expect(damageForAction("heavy")).toBe(TEST_PROFILE.actions.heavy?.damage);
  });

  it("gives an action the profile says nothing about no damage, rather than inventing one", () => {
    restoreWorld = withProfile({ ...TEST_PROFILE, actions: { sprint: { moveInches: 1 } } });
    expect(damageForAction("heavy")).toBe(0);
  });
});

describe("normalizeProfile keeps only what this module knows", () => {
  it("drops actions it has never heard of", () => {
    const profile = normalizeProfile({
      dicePoolPerKnightBonus: 1,
      faceToAction: { 1: "teleport", 2: "sprint" },
      clashTestActions: ["teleport", "light"],
      actions: { teleport: { damage: 99 }, light: { damage: 2 } }
    });

    expect(profile.faceToAction[1]).toBeUndefined();
    expect(profile.faceToAction[2]).toBe("sprint");
    expect(profile.clashTestActions).toEqual(["light"]);
    expect(Object.keys(profile.actions)).toEqual(["light"]);
  });

  it("drops faces outside the die", () => {
    const profile = normalizeProfile({ faceToAction: { 0: "sprint", 7: "heavy", 3: "shift" } });
    expect(Object.keys(profile.faceToAction)).toEqual(["3"]);
  });

  it("reads nonsense numbers as zero rather than passing them through", () => {
    const profile = normalizeProfile({
      dicePoolPerKnightBonus: -4,
      minDicePoolFloor: "lots",
      actions: { sprint: { moveInches: -1 } }
    });

    expect(profile.dicePoolPerKnightBonus).toBe(0);
    expect(profile.minDicePoolFloor).toBe(0);
    expect(profile.actions.sprint?.moveInches).toBe(0);
  });

  it("reads anything that is not an object as blank", () => {
    for (const bad of [null, undefined, 42, "profile", []]) {
      expect(normalizeProfile(bad)).toEqual(BLANK_PROFILE);
    }
  });
});

describe("importing a profile", () => {
  it("stores one the module can read back", async () => {
    restoreWorld = withBlankProfile();
    await importProfile({
      dicePoolPerKnightBonus: 3,
      faceToAction: { 4: "bash" },
      clashTestActions: ["bash"],
      actions: { bash: { moveInches: 6 } }
    });

    const stored = getProfile();
    expect(stored.dicePoolPerKnightBonus).toBe(3);
    expect(stored.faceToAction[4]).toBe("bash");
    expect(describeAction("bash").moveInches).toBe(6);
  });

  it("refuses something that is not a profile", async () => {
    restoreWorld = withBlankProfile();
    await expect(importProfile("a profile, honest")).rejects.toThrow(RulesProfileInvalidError);
  });

  it("refuses one that maps no face, since nothing in it could be played", async () => {
    restoreWorld = withBlankProfile();
    await expect(importProfile({ dicePoolPerKnightBonus: 2 })).rejects.toThrow(
      /maps no die face/
    );
  });
});

describe("the template tells the user what to supply, not what to put", () => {
  it("offers every face and every action, all empty", () => {
    const template = JSON.parse(profileTemplate());

    expect(Object.keys(template.faceToAction)).toEqual(DIE_FACES.map(String));
    expect(Object.keys(template.actions)).toEqual([...ACTION_IDS]);
    expect(Object.values(template.faceToAction).every((v) => v === "")).toBe(true);
    expect(template.dicePoolPerKnightBonus).toBe(0);
  });

  it("carries no value but zero, false and empty", () => {
    // The face *keys* 1-6 are in there, and belong there -- they are the die's
    // faces, which is the shape of the form rather than an answer on it. What
    // must be empty is every value.
    const template = JSON.parse(profileTemplate()) as Record<string, unknown>;

    const values: unknown[] = [];
    const walk = (node: unknown): void => {
      if (node !== null && typeof node === "object") {
        Object.values(node as Record<string, unknown>).forEach(walk);
      } else {
        values.push(node);
      }
    };
    walk(template);

    expect(values.length).toBeGreaterThan(20);
    expect(values.filter((v) => v !== 0 && v !== "" && v !== false)).toEqual([]);
  });
});

describe("the constants file carries no rules numbers", () => {
  /**
   * Blunt on purpose. The whole strip is undone by one
   * `export const SOMETHING = 5` landing back in that file, which is exactly
   * how the numbers got there the first time.
   */
  it("exports only identity, vocabulary and setting keys", async () => {
    const constants = (await import("../src/constants")) as Record<string, unknown>;
    expect(new Set(Object.keys(constants))).toEqual(
      new Set([
        "MODULE_ID",
        "KNIGHT_ACTOR_TYPE",
        "ACTION_IDS",
        "DIE_FACES",
        "SETTING_RULES_PROFILE",
        "SETTING_MIN_DICE_POOL_FLOOR_ENABLED",
        "SETTING_PROMPT_FIRST_OR_SECOND",
        "SETTING_PROMPT_ATTACK_TARGET",
        "DEFAULT_FIRST_OR_SECOND_CHOICE",
        "DEFAULT_ATTACK_TARGET_CHOICE"
      ])
    );
  });

  it("holds no bare number at all", async () => {
    const constants = (await import("../src/constants")) as Record<string, unknown>;
    const numbers = Object.entries(constants).filter(([, v]) => typeof v === "number");
    expect(numbers).toEqual([]);
  });

  it("keeps DIE_FACES as the die's shape, not a rules value", () => {
    // Which faces a die has is what the VTT rolls; what each buys is the
    // world's. Only the former belongs here.
    expect([...DIE_FACES]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(MODULE_ID).toBe("battleframe-greathelm");
    expect(SETTING_RULES_PROFILE).toBe("rulesProfile");
  });
});

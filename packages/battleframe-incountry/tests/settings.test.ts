import { afterEach, describe, expect, it } from "vitest";
import { DIE_SIZE_UNSET, MODULE_ID, SETTING_DIE_SIZE } from "../src/constants";
import {
  DieSizeNotSetError,
  getDieSize,
  registerSettings,
  requireDieSize
} from "../src/settings";
import { withDieSize } from "./helpers/world";

/**
 * The guard on the rules-content strip.
 *
 * This module used to ship the die its rulebook resolves on as a constant. It
 * now ships nothing and asks the world. The failure mode worth testing is not
 * "does the setting work" but **"does anything quietly answer for it"** -- a
 * fallback anywhere on the roll path would put the published number back in the
 * repository while every other test stayed green.
 */

let restoreWorld: (() => void) | undefined;

afterEach(() => {
  restoreWorld?.();
  restoreWorld = undefined;
});

describe("the die size ships unset", () => {
  it("registers with no playable default", () => {
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

    registerSettings();
    globalScope.game = previous;

    expect(registered).toHaveLength(1);
    expect(registered[0].default).toBe(DIE_SIZE_UNSET);
    expect(registered[0].default).toBe(0);
  });

  it("reads as unset in a world that has not chosen", () => {
    restoreWorld = withDieSize(DIE_SIZE_UNSET);
    expect(getDieSize()).toBe(DIE_SIZE_UNSET);
  });

  it("reads as unset when there is no Foundry at all", () => {
    const globalScope = globalThis as unknown as { game?: unknown };
    const previous = globalScope.game;
    globalScope.game = undefined;
    try {
      expect(getDieSize()).toBe(DIE_SIZE_UNSET);
    } finally {
      globalScope.game = previous;
    }
  });
});

describe("requireDieSize refuses rather than falling back", () => {
  it("throws in a world that has not chosen a die", () => {
    restoreWorld = withDieSize(DIE_SIZE_UNSET);
    expect(() => requireDieSize()).toThrow(DieSizeNotSetError);
  });

  it("says why, and where to fix it", () => {
    restoreWorld = withDieSize(DIE_SIZE_UNSET);
    expect(() => requireDieSize()).toThrow(/ships no rules numbers/);
    expect(() => requireDieSize()).toThrow(/module settings/);
  });

  it("hands back the world's own die once it is set", () => {
    restoreWorld = withDieSize(20);
    expect(requireDieSize()).toBe(20);
  });

  it("refuses a nonsense value instead of coercing it to something rollable", () => {
    for (const bad of [-1, 0, 2.5]) {
      restoreWorld?.();
      restoreWorld = withDieSize(bad);
      expect(() => requireDieSize()).toThrow(DieSizeNotSetError);
    }
  });
});

describe("the constants file carries no rules numbers", () => {
  /**
   * A blunt guard, and deliberately so. The whole strip is undone by one
   * `export const SOMETHING = 10` landing back in this file, which is exactly
   * how it got there the first time.
   */
  it("exports only the module id, the actor subtype, and the setting keys", async () => {
    const constants = await import("../src/constants");
    expect(new Set(Object.keys(constants))).toEqual(
      new Set(["MODULE_ID", "UNIT_ACTOR_TYPE", "SETTING_DIE_SIZE", "DIE_SIZE_UNSET"])
    );
  });

  it("holds no number but the unset sentinel", async () => {
    const constants = (await import("../src/constants")) as Record<string, unknown>;
    const numbers = Object.entries(constants).filter(([, v]) => typeof v === "number");
    expect(numbers).toEqual([["DIE_SIZE_UNSET", 0]]);
  });

  it("keeps the setting key and the module id as themselves", () => {
    expect(MODULE_ID).toBe("battleframe-incountry");
    expect(SETTING_DIE_SIZE).toBe("dieSize");
  });
});

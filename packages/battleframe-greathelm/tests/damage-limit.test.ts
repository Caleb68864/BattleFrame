import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { damageLimit, isKnightRemoved } from "../src/round/removal";
import { applyClashDamage } from "../src/round/loop";
import { MODULE_ID, SETTING_RULES_PROFILE } from "../src/constants";
import { BLANK_PROFILE, normalizeProfile, profileTemplate } from "../src/rules-profile";

function world(profile: unknown): void {
  vi.stubGlobal("game", {
    settings: {
      get: (ns: string, key: string) => (ns === MODULE_ID && key === SETTING_RULES_PROFILE ? profile : undefined),
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("the damage limit is the world's", () => {
  it("is part of the profile, blank as shipped and offered by the template", () => {
    expect(BLANK_PROFILE.damageLimit).toBe(0);
    expect(normalizeProfile({ damageLimit: 11 }).damageLimit).toBe(11);
    expect(JSON.parse(profileTemplate()).damageLimit).toBe(0);
  });

  it("removes a knight at the profile's limit, not a printed one", () => {
    world({ damageLimit: 11 });

    expect(damageLimit()).toBe(11);
    expect(isKnightRemoved({ system: { damage: 10 } } as never)).toBe(false);
    expect(isKnightRemoved({ system: { damage: 11 } } as never)).toBe(true);
  });

  it("an unentered limit removes nobody rather than everybody", () => {
    world(BLANK_PROFILE);

    expect(isKnightRemoved({ system: { damage: 0 } } as never)).toBe(false);
    expect(isKnightRemoved({ system: { damage: 9 } } as never)).toBe(false);
  });

  it("clash damage caps at the profile's limit", async () => {
    world({ damageLimit: 11 });
    const update = vi.fn(async () => undefined);

    await applyClashDamage({ system: { damage: 10 }, update } as never, 5);

    expect(update).toHaveBeenCalledWith({ "system.damage": 11 });
  });

  it("clash damage is not capped to zero when the limit is unentered", async () => {
    world(BLANK_PROFILE);
    const update = vi.fn(async () => undefined);

    await applyClashDamage({ system: { damage: 1 }, update } as never, 2);

    expect(update).toHaveBeenCalledWith({ "system.damage": 3 });
  });
});

describe("no printed cap remains", () => {
  const read = (path: string): string => readFileSync(resolve(__dirname, path), "utf8");

  it("the schema declares no maximum", () => {
    expect(read("../src/data/knight.ts")).not.toMatch(/resolveNumberFieldOptions\(\d/);
  });

  it("the hover panel states no maximum", () => {
    expect(read("../src/main.ts")).not.toMatch(/max: \d/);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerStatusEffects,
  stargruntStatusEffects,
  syncUnitStatuses,
  isUnitWiped,
  SUPPRESSED_STATUS,
  IN_POSITION_STATUS,
  DISORGANISED_STATUS
} from "../src/status";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).CONFIG;
});

describe("stargruntStatusEffects", () => {
  it("contributes suppressed, in-position, and disorganised with core SVG icons", () => {
    const ids = stargruntStatusEffects().map((e) => e.id);
    expect(ids).toEqual([SUPPRESSED_STATUS, IN_POSITION_STATUS, DISORGANISED_STATUS]);
    for (const e of stargruntStatusEffects()) {
      expect(e.img).toMatch(/^icons\/svg\//);
    }
  });
});

describe("registerStatusEffects", () => {
  it("registers each condition via the engine status registry", () => {
    const register = vi.fn();
    (globalThis as any).battleframe = { status: { register } };
    registerStatusEffects();
    expect(register).toHaveBeenCalledTimes(3);
  });

  it("is a no-op when the registry is absent", () => {
    expect(() => registerStatusEffects()).not.toThrow();
  });
});

describe("isUnitWiped", () => {
  it("is true only when every figure is dead", () => {
    expect(isUnitWiped({ figures: [{ status: "dead" }, { status: "dead" }] })).toBe(true);
    expect(isUnitWiped({ figures: [{ status: "dead" }, { status: "ok" }] })).toBe(false);
    expect(isUnitWiped({ figures: [] })).toBe(false);
  });
});

describe("syncUnitStatuses", () => {
  it("toggles each icon to match the data (field is truth, icon is view)", async () => {
    const toggleStatusEffect = vi.fn(async () => undefined);
    await syncUnitStatuses({
      system: { suppression: 2, inPosition: true, disorganised: false, figures: [{ status: "ok" }] },
      toggleStatusEffect
    });
    expect(toggleStatusEffect).toHaveBeenCalledWith(SUPPRESSED_STATUS, { active: true });
    expect(toggleStatusEffect).toHaveBeenCalledWith(IN_POSITION_STATUS, { active: true });
    expect(toggleStatusEffect).toHaveBeenCalledWith(DISORGANISED_STATUS, { active: false });
  });

  it("toggles the core defeated status on when the unit is wiped", async () => {
    (globalThis as any).CONFIG = { specialStatusEffects: { DEFEATED: "dead" } };
    const calls: [string, { active?: boolean }][] = [];
    const toggleStatusEffect = vi.fn(async (id: string, opts: { active?: boolean }) => {
      calls.push([id, opts]);
    });
    await syncUnitStatuses({
      system: { suppression: 0, figures: [{ status: "dead" }] },
      toggleStatusEffect
    });
    expect(calls).toContainEqual(["dead", { active: true }]);
  });

  it("no-ops when the actor cannot toggle status effects", async () => {
    await expect(syncUnitStatuses({ system: { figures: [] } })).resolves.toBeUndefined();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import {
  dirtsideStatusEffects,
  registerStatusEffects,
  statusFlagsFor,
  DAMAGED_STATUS,
  KNOCKED_OUT_STATUS,
  UNDER_FIRE_STATUS,
} from "../src/status";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).CONFIG;
});

/**
 * G8 — battlefield conditions as native status effects: the data FIELD is truth,
 * the token icon is the view. Numeric markers stay fields; only the boolean /
 * threshold conditions go native (per CLAUDE.md).
 */

describe("dirtsideStatusEffects — the three conditions, core SVG icons only", () => {
  it("declares damaged, knocked-out and under-fire, each namespaced", () => {
    const ids = dirtsideStatusEffects().map((e) => e.id);
    expect(ids).toEqual([DAMAGED_STATUS, KNOCKED_OUT_STATUS, UNDER_FIRE_STATUS]);
    expect(dirtsideStatusEffects().every((e) => e.img.startsWith("icons/svg/"))).toBe(true);
  });
});

describe("registerStatusEffects — via the engine status registry", () => {
  it("registers every condition once", () => {
    const registered: string[] = [];
    (globalThis as any).battleframe = { status: { register: (e: any) => registered.push(e.id) } };
    registerStatusEffects();
    expect(registered).toEqual([DAMAGED_STATUS, KNOCKED_OUT_STATUS, UNDER_FIRE_STATUS]);
  });

  it("is a no-op when the registry is absent", () => {
    expect(() => registerStatusEffects()).not.toThrow();
  });
});

describe("statusFlagsFor — the field → icon mapping", () => {
  it("maps damage=ok to nothing lit", () => {
    expect(statusFlagsFor({ damage: "ok" })).toMatchObject({
      damaged: false,
      knockedOut: false,
      defeated: false,
    });
  });
  it("maps damage=damaged", () => {
    expect(statusFlagsFor({ damage: "damaged" })).toMatchObject({ damaged: true, knockedOut: false });
  });
  it("knocked-out also drops from the turn order (defeated)", () => {
    expect(statusFlagsFor({ damage: "knocked-out" })).toMatchObject({
      knockedOut: true,
      defeated: true,
    });
  });
  it("reads under-fire off its own boolean", () => {
    expect(statusFlagsFor({ underFire: true }).underFire).toBe(true);
    expect(statusFlagsFor({}).underFire).toBe(false);
  });
});

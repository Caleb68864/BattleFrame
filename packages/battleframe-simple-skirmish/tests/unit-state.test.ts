import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCasualties,
  isUnitDestroyed,
  syncDefeatedStatus,
  unitModels,
  type UnitActorLike
} from "../src/data/unit-state";

type ToggleSpy = ReturnType<typeof vi.fn>;

function unit(
  models: number
): UnitActorLike & { system: { models: number }; toggleStatusEffect: ToggleSpy } {
  const actor = {
    system: { models },
    toggleStatusEffect: vi.fn(async () => undefined),
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") {
        actor.system.models = next;
      }
    }
  };
  return actor;
}

afterEach(() => {
  // CONFIG is a live global in Foundry; tests that stub it must not leak.
  delete (globalThis as { CONFIG?: unknown }).CONFIG;
});

describe("unitModels", () => {
  it("reads the model count, defaulting missing to 0", () => {
    expect(unitModels(unit(4))).toBe(4);
    expect(unitModels({ update: vi.fn() })).toBe(0);
  });
});

describe("isUnitDestroyed", () => {
  it("is destroyed at zero models, alive above it", () => {
    expect(isUnitDestroyed(unit(0))).toBe(true);
    expect(isUnitDestroyed(unit(1))).toBe(false);
  });
});

describe("applyCasualties", () => {
  it("removes that many models, never below zero", async () => {
    const u = unit(3);
    await applyCasualties(u, 2);
    expect(u.system.models).toBe(1);

    await applyCasualties(u, 5); // more than remain
    expect(u.system.models).toBe(0);
    expect(isUnitDestroyed(u)).toBe(true);
  });

  it("does not write when there are no casualties", async () => {
    const u = unit(3);
    u.update = vi.fn(async () => undefined);
    await applyCasualties(u, 0);
    expect(u.update).not.toHaveBeenCalled();
  });

  // Roadmap P1: a wiped unit must be visibly out on the token, not just at
  // models 0. The casualty that empties the unit fires Foundry's native
  // "defeated" status (the skull), synced + persisted like the rest of the doc.
  it("fires the native defeated status when the last model falls", async () => {
    const u = unit(2);
    await applyCasualties(u, 2);
    expect(u.toggleStatusEffect).toHaveBeenCalledWith("dead", { active: true });
  });

  it("does not mark a unit defeated while models remain", async () => {
    const u = unit(3);
    await applyCasualties(u, 1);
    expect(u.toggleStatusEffect).toHaveBeenCalledWith("dead", { active: false });
  });
});

describe("syncDefeatedStatus", () => {
  it("uses the configured DEFEATED status id when Foundry provides one", async () => {
    (globalThis as { CONFIG?: unknown }).CONFIG = {
      specialStatusEffects: { DEFEATED: "defeated" }
    };
    const u = unit(0);
    await syncDefeatedStatus(u);
    expect(u.toggleStatusEffect).toHaveBeenCalledWith("defeated", { active: true });
  });

  it("is a no-op when the actor cannot toggle statuses", async () => {
    await expect(
      syncDefeatedStatus({ system: { models: 0 }, update: vi.fn() })
    ).resolves.toBeUndefined();
  });
});

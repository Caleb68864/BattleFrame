import { describe, expect, it, vi } from "vitest";
import {
  applyCasualties,
  isUnitDestroyed,
  unitModels,
  type UnitActorLike
} from "../src/data/unit-state";

function unit(models: number): UnitActorLike & { system: { models: number } } {
  const actor = {
    system: { models },
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") {
        actor.system.models = next;
      }
    }
  };
  return actor;
}

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
});

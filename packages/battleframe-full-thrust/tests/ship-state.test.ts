import { afterEach, describe, expect, it, vi } from "vitest";
import { isShipDestroyed, applyDamageToShip, type ShipActorLike } from "../src/data/ship-state";

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeShip(system: Record<string, unknown>): ShipActorLike & { updates: unknown[]; toggles: unknown[] } {
  const updates: unknown[] = [];
  const toggles: unknown[] = [];
  return {
    system,
    updates,
    toggles,
    update: (data: unknown) => {
      updates.push(data);
      return Promise.resolve();
    },
    toggleStatusEffect: (id: string, opts: unknown) => {
      toggles.push({ id, opts });
      return Promise.resolve();
    }
  };
}

describe("isShipDestroyed", () => {
  it("is true once every hull box is crossed off", () => {
    expect(isShipDestroyed(fakeShip({ hull: { boxes: 18, damage: 18 } }))).toBe(true);
  });
  it("is false while hull boxes remain", () => {
    expect(isShipDestroyed(fakeShip({ hull: { boxes: 18, damage: 17 } }))).toBe(false);
  });
});

describe("applyDamageToShip", () => {
  it("writes the new armour and hull damage back to the actor", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const ship = fakeShip({
      armour: { boxes: 4, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 }
    });

    const result = await applyDamageToShip(ship, 8);

    expect(result.armour.damage).toBe(4);
    expect(result.hull.damage).toBe(4);
    expect(ship.updates).toContainEqual({
      "system.armour.damage": 4,
      "system.hull.damage": 4
    });
  });

  it("toggles the native defeated status when the ship is destroyed", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const ship = fakeShip({
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 6, damage: 0, rows: 2 }
    });

    const result = await applyDamageToShip(ship, 6);

    expect(result.destroyed).toBe(true);
    expect(ship.toggles).toContainEqual({ id: "dead", opts: { active: true } });
  });

  it("returns the thresholds crossed so the caller can run the threshold check", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const ship = fakeShip({
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 }
    });

    const result = await applyDamageToShip(ship, 6);
    expect(result.hull.thresholdsCrossed).toEqual([1]);
  });
});

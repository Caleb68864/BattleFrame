import { afterEach, describe, expect, it, vi } from "vitest";
import { registerShipStatusEffects, syncShipStatuses, CRIPPLED_STATUS, WEAPONS_OFFLINE_STATUS } from "../src/status";

afterEach(() => vi.unstubAllGlobals());

function fakeShip(system: Record<string, any>) {
  const toggles: Array<{ id: string; active: boolean }> = [];
  return {
    system,
    toggles,
    toggleStatusEffect: (id: string, opts: { active: boolean }) => {
      toggles.push({ id, active: opts.active });
      return Promise.resolve();
    }
  };
}

describe("registerShipStatusEffects", () => {
  it("registers crippled + weapons-offline via the engine status registry, once", () => {
    // Simulate the engine's idempotent register onto CONFIG.statusEffects.
    const effects: any[] = [];
    const register = (e: any) => {
      if (!effects.some((x) => x.id === e.id)) effects.push(e);
    };
    vi.stubGlobal("battleframe", { status: { register } });

    registerShipStatusEffects();
    registerShipStatusEffects(); // idempotent

    const ids = effects.map((s) => s.id);
    expect(ids.filter((i) => i === CRIPPLED_STATUS)).toHaveLength(1);
    expect(ids.filter((i) => i === WEAPONS_OFFLINE_STATUS)).toHaveLength(1);
  });

  it("does nothing when the engine registry is absent", () => {
    vi.stubGlobal("battleframe", undefined);
    vi.stubGlobal("game", undefined);
    expect(() => registerShipStatusEffects()).not.toThrow();
  });
});

describe("syncShipStatuses", () => {
  it("flags crippled when the drives are dead (thrust 0)", async () => {
    const ship = fakeShip({ thrust: 0, fcs: 2 });
    await syncShipStatuses(ship);
    expect(ship.toggles).toContainEqual({ id: CRIPPLED_STATUS, active: true });
    expect(ship.toggles).toContainEqual({ id: WEAPONS_OFFLINE_STATUS, active: false });
  });

  it("flags weapons-offline when all fire control is gone (fcs 0)", async () => {
    const ship = fakeShip({ thrust: 4, fcs: 0 });
    await syncShipStatuses(ship);
    expect(ship.toggles).toContainEqual({ id: WEAPONS_OFFLINE_STATUS, active: true });
    expect(ship.toggles).toContainEqual({ id: CRIPPLED_STATUS, active: false });
  });

  it("clears both when the ship is healthy", async () => {
    const ship = fakeShip({ thrust: 4, fcs: 2 });
    await syncShipStatuses(ship);
    expect(ship.toggles).toContainEqual({ id: CRIPPLED_STATUS, active: false });
    expect(ship.toggles).toContainEqual({ id: WEAPONS_OFFLINE_STATUS, active: false });
  });
});

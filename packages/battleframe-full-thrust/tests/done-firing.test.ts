import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addSceneControl, doneFiringAction } from "../src/ui/round-control";
import langEn from "../lang/en.json";
import { withRules } from "./helpers/world";

// Owner decision 2026-11-16: Fire is what closes a ship's fire activation, so a
// ship armed only with needles, salvos or a spinal mount could never close one.
// "Done firing" ends the active ship's activation and advances to the next side
// through the same advanceFireOrder Fire uses. Same gate as Fire.

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

function ship(id: string, disposition: number) {
  return {
    id,
    name: id,
    document: { disposition },
    actor: { type: "battleframe-full-thrust.ship", system: { weapons: [], hull: 4, hullDamage: 0 }, update: vi.fn() }
  };
}

function world(opts: { firePhase?: unknown; activeSide?: string; eligible?: string[]; gm?: boolean; rounds?: boolean; complete?: boolean }) {
  const warn = vi.fn();
  const info = vi.fn();
  const create = vi.fn(async () => undefined);
  const setFlag = vi.fn();
  const unsetFlag = vi.fn();
  const attacker = ship("a1", 1);
  const other = ship("b1", -1);
  const order = {
    activeSideId: () => opts.activeSide,
    isComplete: () => opts.complete ?? false,
    eligible: () => opts.eligible ?? [],
    activate: vi.fn(),
    serialize: () => ({ saved: true }),
    toState: () => ({}),
    initiativeOrder: () => [],
    sides: () => []
  };
  vi.stubGlobal("game", {
    ...(globalThis as any).game,
    user: { isGM: opts.gm ?? true, targets: { first: () => undefined } },
    battleframe: {
      ...(opts.rounds === false
        ? {}
        : { rounds: { createActivationOrder: vi.fn(() => order), restoreActivationOrder: vi.fn(() => order) } })
    },
    combats: { active: undefined }
  });
  vi.stubGlobal("canvas", {
    tokens: { controlled: [attacker], placeables: [attacker, other] },
    scene: { getFlag: () => opts.firePhase, setFlag, unsetFlag }
  });
  vi.stubGlobal("ChatMessage", { create, getSpeaker: () => ({}) });
  vi.stubGlobal("ui", { notifications: { warn, error: vi.fn(), info } });
  vi.stubGlobal("foundry", undefined);
  return { warn, info, create, order, setFlag, unsetFlag };
}

describe("Done firing", () => {
  it("ends the active ship's activation and advances to the next side", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "1", eligible: ["a1"] });
    await doneFiringAction();
    expect(w.warn).not.toHaveBeenCalled();
    expect(w.order.activate).toHaveBeenCalledWith("a1");
    expect(w.setFlag).toHaveBeenCalledWith("battleframe-full-thrust", expect.any(String), { saved: true });
    expect(w.create).toHaveBeenCalled(); // the fire-phase tracker card, as after Fire
    expect(w.info).toHaveBeenCalledWith(expect.stringContaining("a1 is done firing"));
  });

  it("closes the phase when it was the last ship to fire", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "1", eligible: ["a1"], complete: true });
    await doneFiringAction();
    expect(w.order.activate).toHaveBeenCalledWith("a1");
    expect(w.unsetFlag).toHaveBeenCalled();
    expect(w.setFlag).not.toHaveBeenCalled();
  });

  it("refuses outside the fire phase", async () => {
    const w = world({ firePhase: undefined });
    await doneFiringAction();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("fire phase"));
    expect(w.order.activate).not.toHaveBeenCalled();
  });

  it("refuses a ship whose side is not active", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "-1", eligible: ["b1"] });
    await doneFiringAction();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("turn to fire"));
    expect(w.order.activate).not.toHaveBeenCalled();
    expect(w.setFlag).not.toHaveBeenCalled();
  });

  it("refuses a ship that has already fired this phase", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "1", eligible: [] });
    await doneFiringAction();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("turn to fire"));
    expect(w.order.activate).not.toHaveBeenCalled();
  });

  it("refuses a non-GM, as Fire does", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "1", eligible: ["a1"], gm: false });
    await doneFiringAction();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("only the GM"));
    expect(w.order.activate).not.toHaveBeenCalled();
  });

  it("warns when no fire order can be restored", async () => {
    const w = world({ firePhase: { anything: true }, rounds: false });
    await doneFiringAction();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("no fire order"));
  });

  it("is a GM scene tool in the core band, right after Fire, with a localized title", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: any[] = [];
    addSceneControl(controls);
    const tools = controls.find((c) => c.name === "battleframe-full-thrust").tools as any[];
    const done = tools.find((t) => t.name === "full-thrust-done-firing");
    const fire = tools.find((t) => t.name === "full-thrust-fire");
    expect(done).toBeTruthy();
    expect(done.order).toBe(fire.order + 1);
    expect((langEn as Record<string, string>)[done.title]).toBeTypeOf("string");
  });
});

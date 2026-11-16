import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { needleAction, salvoAction } from "../src/ui/round-control";
import { withRules } from "./helpers/world";

// Roadmap P0 #1/#3/#4: Fire and Split Fire honour the fire phase and its
// alternation; Needle Beam and Fire Salvo did not, so a GM could snipe during
// plotting or out of turn. Both now take the same gate as Fire. They do NOT
// advance the order: a ship fires every weapon in one activation, and the Fire
// tool (beams) is what closes it.

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

function ship(id: string, disposition: number, weapons: unknown[] = []) {
  return {
    id,
    name: id,
    document: { disposition },
    actor: { type: "battleframe-full-thrust.ship", system: { weapons, hull: 4, hullDamage: 0 }, update: vi.fn(), toggleStatusEffect: vi.fn() }
  };
}

function world(opts: { firePhase?: unknown; activeSide?: string; eligible?: string[] }) {
  const warn = vi.fn();
  const rollPool = vi.fn(async (n: number) => Array.from({ length: n }, () => 6));
  const create = vi.fn(async () => undefined);
  const attacker = ship("a1", 1, [
    { kind: "needle", arcs: ["F", "FP", "FS", "A", "AP", "AS"] },
    { kind: "salvo", arcs: ["F", "FP", "FS", "A", "AP", "AS"] }
  ]);
  const target = ship("b1", -1);
  const order = {
    activeSideId: () => opts.activeSide,
    isComplete: () => false,
    eligible: () => opts.eligible ?? [],
    activate: vi.fn(),
    toState: () => ({})
  };
  vi.stubGlobal("game", {
    ...(globalThis as any).game,
    user: { isGM: true, targets: { first: () => target } },
    battleframe: {
      measure: { between: () => ({ distance: 1 }) },
      facing: { bearingOf: () => 0, arcOf: () => "F" },
      dice: { rollPool },
      rounds: { createActivationOrder: vi.fn(() => order), restoreActivationOrder: vi.fn(() => order) }
    },
    combats: { active: undefined }
  });
  vi.stubGlobal("canvas", {
    tokens: { controlled: [attacker], placeables: [attacker, target] },
    scene: { getFlag: () => opts.firePhase, setFlag: vi.fn(), unsetFlag: vi.fn() }
  });
  vi.stubGlobal("ChatMessage", { create, getSpeaker: () => ({}) });
  vi.stubGlobal("ui", { notifications: { warn, error: vi.fn(), info: vi.fn() } });
  vi.stubGlobal("foundry", undefined);
  return { warn, rollPool, create, order };
}

describe.each([
  ["Needle Beam", needleAction],
  ["Fire Salvo", salvoAction]
])("%s honours the fire phase", (_name, action) => {
  it("refuses during plotting (no fire phase running)", async () => {
    const w = world({ firePhase: undefined });
    await action();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("fire phase"));
    expect(w.rollPool).not.toHaveBeenCalled();
    expect(w.create).not.toHaveBeenCalled();
  });

  it("refuses when it is the other side's turn", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "-1", eligible: ["b1"] });
    await action();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("turn to fire"));
    expect(w.rollPool).not.toHaveBeenCalled();
    expect(w.create).not.toHaveBeenCalled();
  });

  it("refuses a ship that has already fired this phase", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "1", eligible: [] });
    await action();
    expect(w.warn).toHaveBeenCalledWith(expect.stringContaining("turn to fire"));
    expect(w.create).not.toHaveBeenCalled();
  });

  it("fires for the active side's unfired ship, and leaves the order for Fire to advance", async () => {
    const w = world({ firePhase: { anything: true }, activeSide: "1", eligible: ["a1"] });
    await action();
    expect(w.warn).not.toHaveBeenCalled();
    expect(w.create).toHaveBeenCalled();
    expect(w.order.activate).not.toHaveBeenCalled();
  });
});

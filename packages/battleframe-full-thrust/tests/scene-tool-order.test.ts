import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addSceneControl } from "../src/ui/round-control";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


afterEach(() => vi.unstubAllGlobals());

/** The everyday turn-loop tools a player hunts for -- these must sort first. */
const CORE = [
  "full-thrust-ready",
  "full-thrust-initiative",
  "full-thrust-phase-status",
  "full-thrust-plot",
  "full-thrust-execute",
  "full-thrust-fire",
  "full-thrust-new-turn",
  "full-thrust-new-battle",
  "full-thrust-import"
];

/** The specialist per-weapon / per-mode tools -- these recede after the core. */
const NICHE = [
  "full-thrust-targeting",
  "full-thrust-split-fire",
  "full-thrust-arcs",
  "full-thrust-needle",
  "full-thrust-salvo",
  "full-thrust-launch-missile",
  "full-thrust-advance-missiles",
  "full-thrust-nova-cannon",
  "full-thrust-charge-wave-gun",
  "full-thrust-wave-gun",
  "full-thrust-launch-fighters",
  "full-thrust-recover-fighters",
  "full-thrust-fighter-move",
  "full-thrust-vector-move",
  "full-thrust-damage-control"
];

/** Collects the Full Thrust control's tools as a name -> order map (array payload). */
function toolOrders(): Record<string, number> {
  vi.stubGlobal("game", { user: { isGM: true } });
  const controls: any[] = [];
  addSceneControl(controls);
  const control = controls.find((c) => c.name === "battleframe-full-thrust");
  expect(control).toBeTruthy();
  const orders: Record<string, number> = {};
  for (const tool of control.tools as any[]) {
    orders[tool.name] = tool.order;
  }
  return orders;
}

describe("scene-tool ordering invariant", () => {
  it("sorts every core turn-loop tool before every niche tool", () => {
    const orders = toolOrders();
    const maxCore = Math.max(...CORE.map((n) => orders[n]));
    const minNiche = Math.min(...NICHE.map((n) => orders[n]));
    expect(maxCore).toBeLessThan(minNiche);
  });

  it("keeps Plot and Fire prominent (in the core, low-order band)", () => {
    const orders = toolOrders();
    const minNiche = Math.min(...NICHE.map((n) => orders[n]));
    expect(orders["full-thrust-plot"]).toBeLessThan(minNiche);
    expect(orders["full-thrust-fire"]).toBeLessThan(minNiche);
  });

  it("lists all expected tools (nothing dropped)", () => {
    const orders = toolOrders();
    for (const name of [...CORE, ...NICHE]) {
      expect(orders[name], `missing tool ${name}`).toBeTypeOf("number");
    }
  });

  it("keeps Plot the default active tool", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: any[] = [];
    addSceneControl(controls);
    const control = controls.find((c) => c.name === "battleframe-full-thrust");
    expect(control.activeTool).toBe("full-thrust-plot");
  });
});

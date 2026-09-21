/**
 * Visual SSD hull track (roadmap P1 #10): the ship sheet renders the hull as a
 * row of clickable boxes with the FT2 threshold-row separators, instead of a bare
 * number input. `prepareHullBoxes` is the pure view-model; `onToggleHullBox` is
 * the click handler that sets `system.hull.damage` from the clicked box.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prepareHullBoxes, onToggleHullBox } from "../src/sheets/ship-sheet";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("prepareHullBoxes", () => {
  it("marks the first `damage` boxes damaged and the rest intact", () => {
    const boxes = prepareHullBoxes(6, 2, 3) as any[];
    expect(boxes).toHaveLength(6);
    expect(boxes.slice(0, 2).every((b) => b.damaged)).toBe(true);
    expect(boxes.slice(2).every((b) => !b.damaged)).toBe(true);
    // each box carries its 1-based number for the click target
    expect(boxes[0].number).toBe(1);
    expect(boxes[5].number).toBe(6);
  });

  it("flags the last box of each threshold row (except the final box) as a row end", () => {
    // 6 boxes / 3 rows = 2/2/2 → boundaries [2,4,6]; separators after box 2 and 4.
    const boxes = prepareHullBoxes(6, 0, 3) as any[];
    expect(boxes[1].rowEnd).toBe(true); // box 2
    expect(boxes[3].rowEnd).toBe(true); // box 4
    expect(boxes[5].rowEnd).toBe(false); // final box = destruction, no separator
    expect(boxes[0].rowEnd).toBe(false);
  });

  it("handles zero boxes and clamps damage above the box count", () => {
    expect(prepareHullBoxes(0, 0, 1)).toHaveLength(0);
    const over = prepareHullBoxes(3, 99, 1) as any[];
    expect(over.every((b) => b.damaged)).toBe(true);
  });
});

describe("onToggleHullBox", () => {
  function fakeApp(damage: number) {
    const updates: any[] = [];
    return {
      updates,
      actor: {
        system: { hull: { boxes: 6, damage, rows: 3 } },
        update: (data: any) => {
          updates.push(data);
          return Promise.resolve();
        }
      }
    };
  }

  it("clicking an intact box fills damage through it", async () => {
    const app = fakeApp(0);
    // click box number 3 (data-number="3")
    await onToggleHullBox.call(app, {}, { dataset: { number: "3" } });
    expect(app.updates[0]["system.hull.damage"]).toBe(3);
  });

  it("clicking a damaged box unfills it and everything beyond", async () => {
    const app = fakeApp(4);
    // box 2 is currently damaged (damage=4 ≥ 2) → clicking it sets damage to 1
    await onToggleHullBox.call(app, {}, { dataset: { number: "2" } });
    expect(app.updates[0]["system.hull.damage"]).toBe(1);
  });

  it("ignores a click with no valid box number", async () => {
    const app = fakeApp(0);
    await onToggleHullBox.call(app, {}, { dataset: {} });
    expect(app.updates).toHaveLength(0);
  });
});

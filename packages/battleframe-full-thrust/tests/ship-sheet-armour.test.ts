/**
 * Visual SSD armour track (roadmap P1 #10, extended from hull): the ship sheet
 * renders armour as a row of clickable boxes, like the hull track but with no
 * threshold-row separators (armour has no thresholds). `prepareArmourBoxes` is
 * the pure view-model; `onToggleArmourBox` is the click handler that sets
 * `system.armour.damage` from the clicked box.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prepareArmourBoxes, onToggleArmourBox } from "../src/sheets/ship-sheet";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("prepareArmourBoxes", () => {
  it("marks the first `damage` boxes damaged and the rest intact", () => {
    const boxes = prepareArmourBoxes(5, 2) as any[];
    expect(boxes).toHaveLength(5);
    expect(boxes.slice(0, 2).every((b) => b.damaged)).toBe(true);
    expect(boxes.slice(2).every((b) => !b.damaged)).toBe(true);
    // each box carries its 1-based number for the click target
    expect(boxes[0].number).toBe(1);
    expect(boxes[4].number).toBe(5);
  });

  it("carries no threshold-row separators (armour has no thresholds)", () => {
    const boxes = prepareArmourBoxes(4, 0) as any[];
    expect(boxes.every((b) => !("rowEnd" in b) || b.rowEnd === false)).toBe(true);
  });

  it("handles zero boxes and clamps damage above the box count", () => {
    expect(prepareArmourBoxes(0, 0)).toHaveLength(0);
    const over = prepareArmourBoxes(3, 99) as any[];
    expect(over.every((b) => b.damaged)).toBe(true);
  });
});

describe("onToggleArmourBox", () => {
  function fakeApp(damage: number) {
    const updates: any[] = [];
    return {
      updates,
      actor: {
        system: { armour: { boxes: 5, damage } },
        update: (data: any) => {
          updates.push(data);
          return Promise.resolve();
        }
      }
    };
  }

  it("clicking an intact box fills damage through it", async () => {
    const app = fakeApp(0);
    await onToggleArmourBox.call(app, {}, { dataset: { number: "3" } });
    expect(app.updates[0]["system.armour.damage"]).toBe(3);
  });

  it("clicking a damaged box unfills it and everything beyond", async () => {
    const app = fakeApp(4);
    // box 2 is currently damaged (damage=4 ≥ 2) → clicking it sets damage to 1
    await onToggleArmourBox.call(app, {}, { dataset: { number: "2" } });
    expect(app.updates[0]["system.armour.damage"]).toBe(1);
  });

  it("ignores a click with no valid box number", async () => {
    const app = fakeApp(0);
    await onToggleArmourBox.call(app, {}, { dataset: {} });
    expect(app.updates).toHaveLength(0);
  });
});

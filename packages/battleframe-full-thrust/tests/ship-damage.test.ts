import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDamageWithArmour } from "../src/ship/damage";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("applyDamageWithArmour (armour absorbs point-for-point before the hull)", () => {
  const hull = { damage: 0, boxes: 18, rows: 3 };

  it("spends armour first and only overflow reaches the hull", () => {
    const result = applyDamageWithArmour({
      armour: { damage: 0, boxes: 5 },
      hull,
      incoming: 8
    });
    expect(result.armour.damage).toBe(5); // armour exhausted
    expect(result.hull.damage).toBe(3); // 3 overflowed to hull
    expect(result.hull.thresholdsCrossed).toEqual([]);
    expect(result.destroyed).toBe(false);
  });

  it("leaves the hull untouched when armour absorbs it all", () => {
    const result = applyDamageWithArmour({
      armour: { damage: 0, boxes: 10 },
      hull,
      incoming: 6
    });
    expect(result.armour.damage).toBe(6);
    expect(result.hull.damage).toBe(0);
  });

  it("sends damage straight to the hull once armour is already gone", () => {
    const result = applyDamageWithArmour({
      armour: { damage: 5, boxes: 5 },
      hull: { damage: 0, boxes: 18, rows: 3 },
      incoming: 6
    });
    expect(result.armour.damage).toBe(5);
    expect(result.hull.damage).toBe(6);
    expect(result.hull.thresholdsCrossed).toEqual([1]);
  });

  it("reports destruction and thresholds through to the hull", () => {
    const result = applyDamageWithArmour({
      armour: { damage: 0, boxes: 0 },
      hull: { damage: 12, boxes: 18, rows: 3 },
      incoming: 6
    });
    expect(result.hull.damage).toBe(18);
    expect(result.destroyed).toBe(true);
  });
});

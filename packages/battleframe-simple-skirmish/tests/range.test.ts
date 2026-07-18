import { describe, expect, it } from "vitest";
import { isInRange, nearestEnemy, type MeasureApiLike, type RangeUnit } from "../src/combat/range";

/**
 * A measure double that returns preset centre-to-centre distances keyed by the
 * second token's id, and asserts the caller asked for centre-to-centre (Simple
 * Skirmish measures range that way, never base-to-base).
 */
function makeMeasure(distances: Record<string, number>): MeasureApiLike {
  return {
    between(_a, b, mode) {
      if (mode !== "centre-to-centre") {
        throw new Error(`range must measure centre-to-centre, got ${mode}`);
      }
      return { distance: distances[(b as { id: string }).id] };
    }
  };
}

const unit = (id: string): RangeUnit => ({ id, token: { id } });

describe("nearestEnemy", () => {
  it("finds the closest enemy by centre-to-centre distance", () => {
    const measure = makeMeasure({ e1: 10, e2: 4, e3: 7 });
    const nearest = nearestEnemy(unit("a1"), [unit("e1"), unit("e2"), unit("e3")], measure);

    expect(nearest?.enemy.id).toBe("e2");
    expect(nearest?.distance).toBe(4);
  });

  it("is undefined when there are no enemies", () => {
    expect(nearestEnemy(unit("a1"), [], makeMeasure({}))).toBeUndefined();
  });
});

describe("isInRange", () => {
  it("is inclusive at the range boundary", () => {
    expect(isInRange(12, 12)).toBe(true);
    expect(isInRange(11.9, 12)).toBe(true);
    expect(isInRange(12.01, 12)).toBe(false);
  });
});

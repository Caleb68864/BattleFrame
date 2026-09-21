/**
 * Pre-fire targeting preview (roadmap P1 #11): for each weapon on a ship, decide
 * — WITHOUT rolling — whether it bears on a target and what it would do at this
 * range. Mirrors resolveWeaponFire's fire/no-fire precedence exactly (destroyed
 * → spent → out-of-arc → per-kind range), so the preview never disagrees with
 * what actually happens when you commit.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { previewTargeting } from "../src/combat/targeting";
import type { WeaponMount } from "../src/combat/fire";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


// Bearing 0 = dead ahead, which falls in the fore ("F") arc.
const FORE = 0;

function beam(cls: number | null, arcs: WeaponMount["arcs"] = ["F"]): WeaponMount {
  return { kind: "beam", weaponClass: cls, arcs };
}

describe("previewTargeting", () => {
  it("reports a beam's dice at range when it bears", () => {
    const rows = previewTargeting({ weapons: [beam(3)], distanceMu: 10, bearing: FORE });
    expect(rows[0]).toMatchObject({ index: 0, kind: "beam", status: "will-fire", dice: 3 });
  });

  it("steps a beam's dice down by range band", () => {
    // Class-3 beam: 3 dice 0-12mu, 2 dice 12-24mu, 1 die 24-36mu.
    const at25 = previewTargeting({ weapons: [beam(3)], distanceMu: 25, bearing: FORE });
    expect(at25[0]).toMatchObject({ status: "will-fire", dice: 1 });
  });

  it("marks a beam out of range beyond its reach", () => {
    const rows = previewTargeting({ weapons: [beam(3)], distanceMu: 40, bearing: FORE });
    expect(rows[0].status).toBe("out-of-range");
  });

  it("marks a weapon out of arc when the target does not bear", () => {
    const rows = previewTargeting({ weapons: [beam(3, ["A"])], distanceMu: 10, bearing: FORE });
    expect(rows[0].status).toBe("out-of-arc");
  });

  it("marks a classless beam no-class", () => {
    const rows = previewTargeting({ weapons: [beam(null)], distanceMu: 10, bearing: FORE });
    expect(rows[0].status).toBe("no-class");
  });

  it("reports destroyed and spent weapons before checking arc/range", () => {
    const weapons: WeaponMount[] = [
      { kind: "beam", weaponClass: 3, arcs: ["A"], destroyed: true },
      { kind: "submunition", arcs: ["A"], spent: true }
    ];
    const rows = previewTargeting({ weapons, distanceMu: 10, bearing: FORE });
    expect(rows[0].status).toBe("destroyed");
    expect(rows[1].status).toBe("spent");
  });

  it("reports a torpedo's to-hit number by band", () => {
    // 6mu bands: 2+ (0-6), 3+ (6-12), ... A shot at 10mu needs 3+.
    const rows = previewTargeting({
      weapons: [{ kind: "torpedo", arcs: ["F"] }],
      distanceMu: 10,
      bearing: FORE
    });
    expect(rows[0]).toMatchObject({ status: "will-fire", toHit: 3 });
  });

  it("marks a torpedo out of range past 30mu", () => {
    const rows = previewTargeting({
      weapons: [{ kind: "torpedo", arcs: ["F"] }],
      distanceMu: 35,
      bearing: FORE
    });
    expect(rows[0].status).toBe("out-of-range");
  });

  it("reports submunition dice and out-of-range past 18mu", () => {
    const near = previewTargeting({
      weapons: [{ kind: "submunition", arcs: ["F"] }],
      distanceMu: 5,
      bearing: FORE
    });
    expect(near[0]).toMatchObject({ status: "will-fire", dice: 3 });
    const far = previewTargeting({
      weapons: [{ kind: "submunition", arcs: ["F"] }],
      distanceMu: 20,
      bearing: FORE
    });
    expect(far[0].status).toBe("out-of-range");
  });

  it("reports a salvo launcher in and out of its 24mu range", () => {
    const inRange = previewTargeting({
      weapons: [{ kind: "salvo", arcs: ["F"] }],
      distanceMu: 20,
      bearing: FORE
    });
    expect(inRange[0].status).toBe("will-fire");
    const outRange = previewTargeting({
      weapons: [{ kind: "salvo", arcs: ["F"] }],
      distanceMu: 30,
      bearing: FORE
    });
    expect(outRange[0].status).toBe("out-of-range");
  });

  it("reports a needle beam in and out of its 9mu range", () => {
    const inRange = previewTargeting({
      weapons: [{ kind: "needle", arcs: ["F"] }],
      distanceMu: 8,
      bearing: FORE
    });
    expect(inRange[0].status).toBe("will-fire");
    const outRange = previewTargeting({
      weapons: [{ kind: "needle", arcs: ["F"] }],
      distanceMu: 10,
      bearing: FORE
    });
    expect(outRange[0].status).toBe("out-of-range");
  });

  it("reports a K-gun's to-hit by band, and out of range beyond 30mu", () => {
    const inRange = previewTargeting({
      weapons: [{ kind: "kgun", weaponClass: 3, arcs: ["F"] }],
      distanceMu: 10,
      bearing: FORE
    });
    expect(inRange[0]).toMatchObject({ kind: "kgun", status: "will-fire", toHit: 3 });
    const outRange = previewTargeting({
      weapons: [{ kind: "kgun", weaponClass: 3, arcs: ["F"] }],
      distanceMu: 31,
      bearing: FORE
    });
    expect(outRange[0].status).toBe("out-of-range");
  });

  it("marks a classless K-gun as no-class, mirroring resolveWeaponFire", () => {
    const rows = previewTargeting({
      weapons: [{ kind: "kgun", weaponClass: null, arcs: ["F"] }],
      distanceMu: 10,
      bearing: FORE
    });
    expect(rows[0].status).toBe("no-class");
  });

  it("gives every row a human-readable effect string", () => {
    const rows = previewTargeting({ weapons: [beam(3)], distanceMu: 10, bearing: FORE });
    expect(typeof rows[0].effect).toBe("string");
    expect(rows[0].effect.length).toBeGreaterThan(0);
  });
});

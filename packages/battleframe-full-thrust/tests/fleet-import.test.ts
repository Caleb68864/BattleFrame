import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFleet } from "../src/data/fleet-import";
import { requireRules } from "../src/rules-profile";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("parseFleet", () => {
  it("parses a fleet of ships into Actor create-data", () => {
    const result = parseFleet({
      fleet: "NAC Task Force",
      ships: [
        {
          name: "RNS Lion",
          mass: 32,
          thrust: 4,
          fcs: 2,
          screens: 1,
          pds: 3,
          weapons: [
            { kind: "beam", weaponClass: 3, arcs: ["F", "FS", "FP"] },
            { kind: "torpedo", arcs: ["F"] }
          ]
        }
      ]
    });

    expect(result.errors).toEqual([]);
    expect(result.ships).toHaveLength(1);
    const ship = result.ships[0];
    expect(ship.name).toBe("RNS Lion");
    expect(ship.type).toBe("battleframe-full-thrust.ship");
    expect(ship.system.mass).toBe(32);
    expect(ship.system.fcs).toBe(2);
    expect(ship.system.weapons).toHaveLength(2);
    expect(ship.system.weapons[0]).toMatchObject({ kind: "beam", weaponClass: 3, destroyed: false, spent: false });
  });

  it("derives the hull damage track from MASS when it is omitted (cruiser -> 3 rows)", () => {
    const result = parseFleet({ ships: [{ name: "CA", mass: 32 }] });
    // Warship DP = half MASS = 16; cruiser (19-36) -> 3 rows.
    expect(result.ships[0].system.hull).toMatchObject({ boxes: 16, rows: 3, damage: 0 });
  });

  it("honours an explicit hull over the derived one", () => {
    const result = parseFleet({ ships: [{ name: "X", mass: 40, hull: { boxes: 20, rows: 4 } }] });
    expect(result.ships[0].system.hull).toMatchObject({ boxes: 20, rows: 4 });
  });

  it("defaults missing fields and clamps out-of-range ones", () => {
    const result = parseFleet({ ships: [{ name: "Y", thrust: 99, screens: 9, course: 20 }] });
    const s = result.ships[0].system;
    expect(s.thrust).toBe(8); // clamped to requireRules().maxThrust
    expect(s.screens).toBe(3); // clamped to max screen level
    expect(s.course).toBe(12); // out of 1-12 -> default
    expect(s.mass).toBe(30); // default
  });

  it("drops weapons with an unknown kind or arc and notes it", () => {
    const result = parseFleet({
      ships: [{ name: "Z", weapons: [{ kind: "phaser", arcs: ["F"] }, { kind: "beam", weaponClass: 2, arcs: ["F", "ZZ"] }] }]
    });
    // 'phaser' dropped entirely; the beam keeps only its valid arc.
    expect(result.ships[0].system.weapons).toHaveLength(1);
    expect(result.ships[0].system.weapons[0].arcs).toEqual(["F"]);
    expect(result.errors.some((e) => e.includes("phaser"))).toBe(true);
  });

  it("accepts a JSON string as well as an object", () => {
    const result = parseFleet('{"ships":[{"name":"S","mass":10}]}');
    expect(result.errors).toEqual([]);
    expect(result.ships[0].name).toBe("S");
  });

  it("reports an error for unparseable or wrong-shaped input", () => {
    expect(parseFleet("not json").errors.length).toBeGreaterThan(0);
    expect(parseFleet({ nope: true }).errors.length).toBeGreaterThan(0);
    expect(parseFleet({ nope: true }).ships).toEqual([]);
  });
});

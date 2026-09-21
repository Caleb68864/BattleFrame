import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fighterMoveForType,
  torpedoHitCount,
  torpedoRunDamage,
  attackFighterDogfightKills
} from "../src/combat/fighter-types";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("fighterMoveForType (Fast moves 18mu, all others 12mu)", () => {
  it("gives a Fast group 18mu", () => {
    expect(fighterMoveForType("fast")).toBe(18);
  });
  it("gives every other type (and the default) 12mu", () => {
    expect(fighterMoveForType("standard")).toBe(12);
    expect(fighterMoveForType("heavy")).toBe(12);
    expect(fighterMoveForType("torpedo")).toBe(12);
    expect(fighterMoveForType(undefined)).toBe(12);
  });
});

describe("torpedoHitCount (Torpedo attack run: each fighter needs 4+ to hit)", () => {
  it("counts one hit per die of 4 or more", () => {
    expect(torpedoHitCount([4, 3, 6, 2, 5])).toBe(3);
    expect(torpedoHitCount([1, 2, 3])).toBe(0);
  });
});

describe("torpedoRunDamage (each hit re-rolled; damage = the number rolled)", () => {
  it("sums the re-roll face of every hit", () => {
    expect(torpedoRunDamage([6, 4, 3])).toBe(13);
  });
  it("is zero with no hits to re-roll", () => {
    expect(torpedoRunDamage([])).toBe(0);
  });
});

describe("attackFighterDogfightKills (Attack/spent-Torpedo: kills only on a 6, one kill)", () => {
  it("scores exactly one kill per 6 and nothing else", () => {
    expect(attackFighterDogfightKills([6, 6, 5, 4, 1])).toBe(2);
    expect(attackFighterDogfightKills([5, 4, 4, 3])).toBe(0);
  });
});

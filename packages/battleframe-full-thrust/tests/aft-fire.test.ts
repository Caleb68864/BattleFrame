import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isAllRoundTurret,
  aftFirePermitted,
  weaponBearsOnWithAftFire
} from "../src/combat/aft-fire";
import { weaponBearsOn } from "../src/combat/arcs";
import type { FireArc } from "../src/constants";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


// An all-round turret is a mount that covers every arc EXCEPT the aft blind spot
// (the 5 forward/side arcs). The Fleet Book conditional rule may then grant it
// the aft arc on a no-thrust turn.
const TURRET: FireArc[] = ["F", "FS", "AS", "AP", "FP"];
const FORWARD_BEAM: FireArc[] = ["F", "FS", "FP"];
const ASTERN = 180; // dead astern -> A arc
const AHEAD = 0; // dead ahead -> F arc

describe("isAllRoundTurret", () => {
  it("is true for a mount covering all five non-aft arcs", () => {
    expect(isAllRoundTurret(TURRET)).toBe(true);
  });

  it("is true even if the mount also lists the aft arc (full 6-arc coverage)", () => {
    expect(isAllRoundTurret(["F", "FS", "AS", "A", "AP", "FP"])).toBe(true);
  });

  it("is false for a partial (e.g. forward-only) mount", () => {
    expect(isAllRoundTurret(FORWARD_BEAM)).toBe(false);
    expect(isAllRoundTurret(["F", "FS", "AS", "AP"])).toBe(false); // missing FP
  });
});

describe("aftFirePermitted (Fleet Book conditional aft fire)", () => {
  it("grants a turret an aft shot on a turn with no main-drive thrust", () => {
    expect(aftFirePermitted(TURRET, ASTERN, false)).toBe(true);
  });

  it("denies the aft shot when the ship applied main-drive thrust", () => {
    expect(aftFirePermitted(TURRET, ASTERN, true)).toBe(false);
  });

  it("denies aft fire to a non-turret mount even with no thrust", () => {
    expect(aftFirePermitted(FORWARD_BEAM, ASTERN, false)).toBe(false);
  });

  it("is irrelevant (false) for targets outside the aft arc", () => {
    // The conditional rule only concerns the aft arc; a fore target is decided
    // by the ordinary arc check, not this grant.
    expect(aftFirePermitted(TURRET, AHEAD, false)).toBe(false);
  });

  it("does not fire for a mount that already covers the aft arc outright", () => {
    // Such a mount already bears via weaponBearsOn; the conditional grant is
    // specifically for a blind-spot turret, so it adds nothing here.
    expect(aftFirePermitted(["F", "FS", "AS", "A", "AP", "FP"], ASTERN, false)).toBe(false);
  });
});

describe("weaponBearsOnWithAftFire (additive over weaponBearsOn)", () => {
  it("adds the conditional aft shot for a turret that did not thrust", () => {
    expect(weaponBearsOnWithAftFire(TURRET, ASTERN, false)).toBe(true);
  });

  it("reduces to weaponBearsOn when the ship thrusted", () => {
    expect(weaponBearsOnWithAftFire(TURRET, ASTERN, true)).toBe(false);
    expect(weaponBearsOnWithAftFire(TURRET, ASTERN, true)).toBe(weaponBearsOn(TURRET, ASTERN));
  });

  it("leaves ordinary in-arc fire unchanged regardless of thrust", () => {
    expect(weaponBearsOnWithAftFire(TURRET, AHEAD, true)).toBe(true);
    expect(weaponBearsOnWithAftFire(FORWARD_BEAM, AHEAD, false)).toBe(true);
  });

  it("never grants aft fire to a non-turret mount", () => {
    expect(weaponBearsOnWithAftFire(FORWARD_BEAM, ASTERN, false)).toBe(false);
    expect(weaponBearsOnWithAftFire(FORWARD_BEAM, ASTERN, false)).toBe(weaponBearsOn(FORWARD_BEAM, ASTERN));
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bayCapacity,
  launchLimit,
  canLaunch,
  carrierCanRecover,
  canRecover,
  enduranceAfterTurn,
  mustReturn,
  isLost,
  recover
} from "../src/combat/carrier";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


/**
 * Verifies the pure carrier fighter-operations core: bay capacity, launch and
 * recovery limits, the reach-home rendezvous test, and endurance depletion /
 * "return or be lost". All values are hand-computed from the user's notes:
 *
 *   - "Carriers & Fighter Bays": each bay holds one 6-fighter group; capacities
 *     Battledreadnought 1/6, Superdreadnought 2/12, Light Carrier 4/24, Fleet or
 *     Attack Carrier 6/36. Actual carriers launch 2 groups/turn, other ships 1;
 *     all fighter-carrying ships recover only 1 group/turn, meeting the group at
 *     the END of a constant-course move.
 *   - "Fighter Endurance": one endurance spent per ACTIVE (combat) turn, loitering
 *     costs nothing; once exhausted the group MUST return, and (More Thrust) a
 *     group that cannot rendezvous within 3 turns of exhaustion is lost.
 *
 * Positions are {x, y} in mu, screen space, matching movement/fighter-move.ts.
 */

describe("bayCapacity", () => {
  it("gives one 6-fighter group per functional bay (the note's class table)", () => {
    // Battledreadnought 1 bay -> 1 group / 6 fighters
    expect(bayCapacity(1)).toEqual({ groups: 1, fighters: 6 });
    // Superdreadnought 2 -> 12
    expect(bayCapacity(2)).toEqual({ groups: 2, fighters: 12 });
    // Light Carrier 4 -> 24
    expect(bayCapacity(4)).toEqual({ groups: 4, fighters: 24 });
    // Fleet / Attack Carrier 6 -> 36
    expect(bayCapacity(6)).toEqual({ groups: 6, fighters: 36 });
  });

  it("has no capacity when every bay is knocked out", () => {
    expect(bayCapacity(0)).toEqual({ groups: 0, fighters: 0 });
  });
});

describe("launchLimit", () => {
  it("is 2 groups/turn for a true carrier and 1 for any other ship", () => {
    expect(launchLimit(true)).toBe(2);
    expect(launchLimit(false)).toBe(1);
  });
});

describe("canLaunch", () => {
  it("lets a true carrier launch until it has launched 2 groups this turn", () => {
    const base = { bays: 6, aboard: 6, isTrueCarrier: true, recoveredThisTurn: 0 };
    expect(canLaunch({ ...base, launchedThisTurn: 0 })).toBe(true);
    expect(canLaunch({ ...base, launchedThisTurn: 1 })).toBe(true);
    expect(canLaunch({ ...base, launchedThisTurn: 2 })).toBe(false);
  });

  it("lets a non-carrier launch only its single group this turn", () => {
    const base = { bays: 1, aboard: 1, isTrueCarrier: false, recoveredThisTurn: 0 };
    expect(canLaunch({ ...base, launchedThisTurn: 0 })).toBe(true);
    expect(canLaunch({ ...base, launchedThisTurn: 1 })).toBe(false);
  });

  it("cannot launch with no groups aboard", () => {
    expect(
      canLaunch({ bays: 6, aboard: 0, isTrueCarrier: true, launchedThisTurn: 0, recoveredThisTurn: 0 })
    ).toBe(false);
  });
});

describe("carrierCanRecover", () => {
  it("recovers at most one group per turn, and only into a free bay", () => {
    // one bay free (4 of 6 aboard, 2 out), none recovered yet -> yes
    expect(
      carrierCanRecover({ bays: 6, aboard: 4, isTrueCarrier: true, launchedThisTurn: 0, recoveredThisTurn: 0 })
    ).toBe(true);
    // already recovered one this turn -> no
    expect(
      carrierCanRecover({ bays: 6, aboard: 4, isTrueCarrier: true, launchedThisTurn: 0, recoveredThisTurn: 1 })
    ).toBe(false);
    // all bays full (nothing deployed) -> nowhere to land -> no
    expect(
      carrierCanRecover({ bays: 6, aboard: 6, isTrueCarrier: true, launchedThisTurn: 0, recoveredThisTurn: 0 })
    ).toBe(false);
  });
});

describe("canRecover", () => {
  it("rendezvouses when the group can reach the carrier within its move", () => {
    // standard 12 mu allowance; carrier 10 mu away -> reaches it
    expect(canRecover({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
    // carrier 13 mu away -> out of reach this turn
    expect(canRecover({ x: 0, y: 0 }, { x: 13, y: 0 })).toBe(false);
    // exactly on the 12 mu limit -> just makes it
    expect(canRecover({ x: 0, y: 0 }, { x: 12, y: 0 })).toBe(true);
  });

  it("lets a Fast group reach a carrier a standard group cannot", () => {
    expect(canRecover({ x: 0, y: 0 }, { x: 16, y: 0 })).toBe(false);
    expect(canRecover({ x: 0, y: 0 }, { x: 16, y: 0 }, "fast")).toBe(true);
  });

  it("honours a docking-range tolerance override", () => {
    // 14 mu away with a 3 mu dock range -> within 12 + 3 = 15 mu reach
    expect(canRecover({ x: 0, y: 0 }, { x: 14, y: 0 }, undefined, 3)).toBe(true);
    // 16 mu away with the same tolerance -> still short
    expect(canRecover({ x: 0, y: 0 }, { x: 16, y: 0 }, undefined, 3)).toBe(false);
  });
});

describe("enduranceAfterTurn", () => {
  it("spends one endurance on an active (combat) turn, preserving other fields", () => {
    const group = { endurance: 3, fighterType: "standard", size: 6 };
    expect(enduranceAfterTurn(group, true)).toEqual({ endurance: 2, fighterType: "standard", size: 6 });
  });

  it("spends nothing on a turn with no combat", () => {
    const group = { endurance: 3, fighterType: "standard" };
    expect(enduranceAfterTurn(group, false)).toEqual({ endurance: 3, fighterType: "standard" });
  });

  it("floors at zero and defaults to an active turn", () => {
    expect(enduranceAfterTurn({ endurance: 0, fighterType: "standard" })).toEqual({
      endurance: 0,
      fighterType: "standard"
    });
  });
});

describe("mustReturn", () => {
  it("is true once endurance is exhausted", () => {
    expect(mustReturn({ endurance: 0 })).toBe(true);
    expect(mustReturn({ endurance: 1 })).toBe(false);
  });
});

describe("isLost", () => {
  it("is lost once 3 turns pass since exhaustion without rendezvous (More Thrust)", () => {
    expect(isLost(0)).toBe(false);
    expect(isLost(2)).toBe(false);
    expect(isLost(3)).toBe(true);
    expect(isLost(4)).toBe(true);
  });
});

describe("recover", () => {
  it("refuels a group back to its type's full endurance, preserving other fields", () => {
    // standard type -> 3 endurance restored
    expect(recover({ endurance: 0, fighterType: "standard", size: 6 })).toEqual({
      endurance: 3,
      fighterType: "standard",
      size: 6
    });
    // Long-Range -> 5 restored
    expect(recover({ endurance: 1, fighterType: "long-range" })).toEqual({
      endurance: 5,
      fighterType: "long-range"
    });
  });
});

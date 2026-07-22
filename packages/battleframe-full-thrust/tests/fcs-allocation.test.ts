/**
 * Multi-FCS fire-splitting (roadmap P2 #18): each working Fire Control System
 * directs fire at ONE target per turn, so a ship with N working FCS may split
 * its weapons across up to N distinct targets — every weapon assigned to a
 * target it bears on AND is in range of. Source: "Fire Control System (FCS)" —
 * "A ship with several FCS may split its fire among that many separate targets,
 * dividing its weapons in any combination between them" / "1 functioning FCS =
 * 1 target ship engaged that turn".
 *
 * The allocator is PURE: the caller supplies each candidate target's already-
 * measured distance + bearing (mirroring `previewTargeting`), and eligibility
 * (bears + in range) is decided by reusing `previewTargeting`, not re-derived.
 */

import { describe, it, expect } from "vitest";
import { allocateFcsFire, validateAllocation } from "../src/combat/fcs-allocation";
import type { AllocationTarget } from "../src/combat/fcs-allocation";
import type { WeaponMount } from "../src/combat/fire";

// Bearings: 0 = dead ahead (fore, "F" arc); 180 = dead astern ("A" arc).
const FORE = 0;
const AFT = 180;

function beam(cls: number | null, arcs: WeaponMount["arcs"] = ["F"]): WeaponMount {
  return { kind: "beam", weaponClass: cls, arcs };
}

const fore = (id: string, distanceMu = 10): AllocationTarget => ({ id, distanceMu, bearing: FORE });
const aft = (id: string, distanceMu = 10): AllocationTarget => ({ id, distanceMu, bearing: AFT });

describe("allocateFcsFire", () => {
  it("concentrates all bearing weapons on one target with a single FCS", () => {
    const result = allocateFcsFire({
      fcsCount: 1,
      weapons: [beam(3, ["F"]), beam(2, ["F"])],
      targets: [fore("T1")]
    });
    expect(result.assignments).toEqual([{ targetId: "T1", weaponIndexes: [0, 1] }]);
    expect(result.unassigned).toEqual([]);
  });

  it("splits weapons across two targets when two FCS are working", () => {
    const result = allocateFcsFire({
      fcsCount: 2,
      weapons: [beam(3, ["F"]), beam(3, ["A"])], // one bears fore, one bears aft
      targets: [fore("T1"), aft("T2")]
    });
    expect(result.assignments).toEqual([
      { targetId: "T1", weaponIndexes: [0] },
      { targetId: "T2", weaponIndexes: [1] }
    ]);
    expect(result.unassigned).toEqual([]);
  });

  it("leaves a weapon unassigned (fcs-cap) when only one FCS but two arcs bear", () => {
    const result = allocateFcsFire({
      fcsCount: 1,
      weapons: [beam(3, ["F"]), beam(3, ["A"])],
      targets: [fore("T1"), aft("T2")]
    });
    expect(result.assignments).toEqual([{ targetId: "T1", weaponIndexes: [0] }]);
    expect(result.unassigned).toEqual([{ index: 1, reason: "fcs-cap" }]);
  });

  it("marks a weapon no-target when it bears on / ranges no candidate", () => {
    const result = allocateFcsFire({
      fcsCount: 1,
      weapons: [beam(3, ["F"])], // fore only, but the only target is astern
      targets: [aft("T1")]
    });
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([{ index: 0, reason: "no-target" }]);
  });

  it("reports destroyed / spent / no-class reasons distinctly", () => {
    const weapons: WeaponMount[] = [
      { kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: true },
      { kind: "submunition", arcs: ["F"], spent: true },
      { kind: "beam", weaponClass: null, arcs: ["F"] }
    ];
    const result = allocateFcsFire({ fcsCount: 2, weapons, targets: [fore("T1")] });
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([
      { index: 0, reason: "destroyed" },
      { index: 1, reason: "spent" },
      { index: 2, reason: "no-class" }
    ]);
  });

  it("conserves FCS slots by concentrating on an already-engaged target", () => {
    // Three weapons all bear on both fore targets; strategy prefers the already-
    // engaged (highest-priority) target rather than opening a second FCS slot.
    const result = allocateFcsFire({
      fcsCount: 2,
      weapons: [beam(3, ["F"]), beam(3, ["F"]), beam(3, ["F"])],
      targets: [fore("T1"), fore("T2")]
    });
    expect(result.assignments).toEqual([{ targetId: "T1", weaponIndexes: [0, 1, 2] }]);
    expect(result.unassigned).toEqual([]);
  });

  it("opens new targets in caller-priority order and packs the rest onto engaged ones", () => {
    const result = allocateFcsFire({
      fcsCount: 2,
      weapons: [beam(3, ["F"]), beam(3, ["A"]), beam(3, ["F"])],
      targets: [fore("T1"), aft("T2")]
    });
    expect(result.assignments).toEqual([
      { targetId: "T1", weaponIndexes: [0, 2] },
      { targetId: "T2", weaponIndexes: [1] }
    ]);
    expect(result.unassigned).toEqual([]);
  });

  it("fires nothing when all FCS are lost (fcsCount 0)", () => {
    const result = allocateFcsFire({
      fcsCount: 0,
      weapons: [beam(3, ["F"])],
      targets: [fore("T1")]
    });
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([{ index: 0, reason: "fcs-cap" }]);
  });

  it("respects per-weapon range: a beam out of range is no-target even in arc", () => {
    const result = allocateFcsFire({
      fcsCount: 1,
      weapons: [beam(3, ["F"])], // class-3 beam reaches 36mu
      targets: [fore("T1", 40)]
    });
    expect(result.unassigned).toEqual([{ index: 0, reason: "no-target" }]);
  });

  it("handles an empty target list by leaving every weapon unassigned", () => {
    const result = allocateFcsFire({
      fcsCount: 2,
      weapons: [beam(3, ["F"]), { kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: true }],
      targets: []
    });
    expect(result.assignments).toEqual([]);
    expect(result.unassigned).toEqual([
      { index: 0, reason: "no-target" },
      { index: 1, reason: "destroyed" }
    ]);
  });

  it("always produces an allocation its own validator accepts", () => {
    const params = {
      fcsCount: 2,
      weapons: [beam(3, ["F"]), beam(3, ["A"]), beam(3, ["F"]), beam(2, ["A"])],
      targets: [fore("T1"), aft("T2")]
    };
    const result = allocateFcsFire(params);
    expect(validateAllocation({ ...params, assignments: result.assignments })).toEqual([]);
  });
});

describe("validateAllocation", () => {
  const base = {
    fcsCount: 2,
    weapons: [beam(3, ["F"]), beam(3, ["A"])],
    targets: [fore("T1"), aft("T2")]
  };

  it("accepts a valid split allocation", () => {
    const violations = validateAllocation({
      ...base,
      assignments: [
        { targetId: "T1", weaponIndexes: [0] },
        { targetId: "T2", weaponIndexes: [1] }
      ]
    });
    expect(violations).toEqual([]);
  });

  it("rejects engaging more distinct targets than the FCS cap", () => {
    const violations = validateAllocation({
      ...base,
      fcsCount: 1,
      assignments: [
        { targetId: "T1", weaponIndexes: [0] },
        { targetId: "T2", weaponIndexes: [1] }
      ]
    });
    expect(violations).toContainEqual({ type: "fcs-cap-exceeded", engaged: 2, cap: 1 });
  });

  it("rejects a weapon assigned to a target it cannot engage, with the reason", () => {
    const violations = validateAllocation({
      ...base,
      assignments: [{ targetId: "T2", weaponIndexes: [0] }] // weapon 0 is fore-only, T2 is astern
    });
    expect(violations).toContainEqual({
      type: "cannot-engage",
      weaponIndex: 0,
      targetId: "T2",
      status: "out-of-arc"
    });
  });

  it("rejects an assignment to an unknown target id", () => {
    const violations = validateAllocation({
      ...base,
      assignments: [{ targetId: "ghost", weaponIndexes: [0] }]
    });
    expect(violations).toContainEqual({ type: "unknown-target", targetId: "ghost" });
  });

  it("rejects the same weapon split across two targets (dice cannot split)", () => {
    const violations = validateAllocation({
      ...base,
      weapons: [beam(3, ["F", "A"])], // bears both fore and aft
      assignments: [
        { targetId: "T1", weaponIndexes: [0] },
        { targetId: "T2", weaponIndexes: [0] }
      ]
    });
    expect(violations).toContainEqual({ type: "duplicate-weapon", weaponIndex: 0 });
  });
});

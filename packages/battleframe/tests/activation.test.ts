import { describe, expect, it } from "vitest";
import {
  createActivationOrder,
  IllegalActivationError,
  type ActivationUnit
} from "../src/rounds/activation";

/**
 * The engine's ruleset-neutral activation-order service. Two tiers:
 *  - a PRIORITY tier that alternates (first side first) over units flagged
 *    hasPriority(), and
 *  - a MAIN tier over everyone else, whose next side is chosen by a pluggable
 *    selector (default alternating; INCOUNTRY injects a count-weighted "bag").
 * A unit that isResolved() (destroyed/removed) needs no activation.
 */

function unit(id: string, sideId: string, extra: Partial<ActivationUnit> = {}): ActivationUnit {
  return { id, sideId, ...extra };
}

describe("createActivationOrder — priority tier", () => {
  it("alternates priority units, first side first", () => {
    const order = createActivationOrder({
      units: [
        unit("a1", "A", { hasPriority: () => true }),
        unit("a2", "A"),
        unit("b1", "B", { hasPriority: () => true }),
        unit("b2", "B")
      ],
      firstSideId: "A"
    });

    expect(order.phase()).toBe("priority");
    expect(order.activeSideId()).toBe("A");
    order.activate("a1");
    expect(order.phase()).toBe("priority");
    expect(order.activeSideId()).toBe("B");
    order.activate("b1");
    // Priority units exhausted -> main tier begins.
    expect(order.phase()).toBe("main");
  });

  it("skips a side that has no priority unit left", () => {
    const order = createActivationOrder({
      units: [
        unit("a1", "A", { hasPriority: () => true }),
        unit("a2", "A", { hasPriority: () => true }),
        unit("b1", "B")
      ],
      firstSideId: "A"
    });

    order.activate("a1");
    // B has no priority unit; the priority tier stays on A rather than stalling.
    expect(order.phase()).toBe("priority");
    expect(order.activeSideId()).toBe("A");
    order.activate("a2");
    expect(order.phase()).toBe("main");
  });

  it("rejects activating a non-priority unit during the priority tier", () => {
    const order = createActivationOrder({
      units: [
        unit("a1", "A", { hasPriority: () => true }),
        unit("a2", "A")
      ],
      firstSideId: "A"
    });

    expect(() => order.activate("a2")).toThrow(IllegalActivationError);
  });
});

describe("createActivationOrder — main tier (default alternating)", () => {
  it("alternates sides, first side first, and completes", () => {
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("a2", "A"), unit("b1", "B")],
      firstSideId: "A"
    });

    expect(order.phase()).toBe("main");
    expect(order.activeSideId()).toBe("A");
    order.activate("a1");
    expect(order.activeSideId()).toBe("B");
    order.activate("b1");
    // B is out of units; alternation continues with A rather than stalling.
    expect(order.activeSideId()).toBe("A");
    order.activate("a2");
    expect(order.isComplete()).toBe(true);
    expect(order.activeSideId()).toBeUndefined();
    expect(order.phase()).toBe("complete");
  });
});

describe("createActivationOrder — main tier (injected bag selector)", () => {
  it("uses the selector to pick the next side, weighted by remaining units", () => {
    const picks = ["B", "A", "A"];
    let call = 0;
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("a2", "A"), unit("b1", "B")],
      firstSideId: "A",
      selectMain: (sides, counts) => {
        // sanity: the selector sees only sides that still have eligible units,
        // and their live counts.
        expect(sides.length).toBeGreaterThan(0);
        expect(counts).toBeTypeOf("object");
        return picks[call++];
      }
    });

    expect(order.activeSideId()).toBe("B");
    order.activate("b1");
    expect(order.activeSideId()).toBe("A");
    order.activate("a1");
    order.activate("a2");
    expect(order.isComplete()).toBe(true);
  });

  it("returns a STABLE active side between calls (selector not re-run until activation)", () => {
    let calls = 0;
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("b1", "B")],
      firstSideId: "A",
      selectMain: (sides) => {
        calls++;
        return sides[0];
      }
    });

    order.activeSideId();
    order.activeSideId();
    order.activeSideId();
    expect(calls).toBe(1);
  });
});

describe("createActivationOrder — resolved units and guards", () => {
  it("treats an isResolved() unit as already done", () => {
    const order = createActivationOrder({
      units: [unit("a1", "A", { isResolved: () => true }), unit("b1", "B")],
      firstSideId: "A"
    });

    // A's only unit is resolved -> it is B's activation, and A never gets a turn.
    expect(order.activeSideId()).toBe("B");
    order.activate("b1");
    expect(order.isComplete()).toBe(true);
  });

  it("rejects an out-of-turn, repeat, resolved, or unknown activation", () => {
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("b1", "B"), unit("b2", "B", { isResolved: () => true })],
      firstSideId: "A"
    });

    expect(() => order.activate("b1")).toThrow(IllegalActivationError); // out of turn (A first)
    expect(() => order.activate("nope")).toThrow(IllegalActivationError); // unknown
    order.activate("a1");
    expect(() => order.activate("a1")).toThrow(IllegalActivationError); // repeat
    expect(() => order.activate("b2")).toThrow(IllegalActivationError); // resolved
  });
});

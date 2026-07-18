import { describe, expect, it } from "vitest";
import {
  createActivationOrder,
  createRoundsApi,
  IllegalActivationError,
  installRoundsApi,
  restoreActivationOrder,
  weightedBagSelector,
  type ActivationUnit
} from "../src/rounds/activation";

/**
 * The engine's ruleset-neutral activation-order service. Two tiers:
 *  - a PRIORITY tier that alternates (first side first) over units flagged
 *    hasPriority(), and
 *  - a MAIN tier over everyone else, whose next side is chosen by a pluggable
 *    selector (default alternating; a ruleset can inject a count-weighted "bag").
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

describe("rounds API — exposed on the namespace for modules", () => {
  it("createRoundsApi exposes the activation factory and bag selector", () => {
    const api = createRoundsApi();
    expect(typeof api.createActivationOrder).toBe("function");
    expect(typeof api.weightedBagSelector).toBe("function");
  });

  it("installRoundsApi puts the service on globalThis.battleframe.rounds", () => {
    installRoundsApi();
    const ns = (globalThis as unknown as { battleframe?: { rounds?: unknown } }).battleframe;
    expect(ns?.rounds).toBeDefined();
  });

  it("installRoundsApi is idempotent — a second call keeps the same object", () => {
    const first = installRoundsApi();
    const second = installRoundsApi();
    expect(second).toBe(first);
  });
});

describe("createActivationOrder — empty, single-side, and bad-selector rounds", () => {
  it("an empty round is immediately complete rather than throwing", () => {
    const order = createActivationOrder({ units: [], firstSideId: "A" });
    expect(order.isComplete()).toBe(true);
    expect(order.phase()).toBe("complete");
    expect(order.activeSideId()).toBeUndefined();
  });

  it("still throws when firstSideId matches no unit in a non-empty round", () => {
    expect(() =>
      createActivationOrder({ units: [unit("a1", "A")], firstSideId: "Z" })
    ).toThrow(IllegalActivationError);
  });

  it("runs a single-side round to completion", () => {
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("a2", "A")],
      firstSideId: "A"
    });
    expect(order.activeSideId()).toBe("A");
    order.activate("a1");
    expect(order.activeSideId()).toBe("A");
    order.activate("a2");
    expect(order.isComplete()).toBe(true);
  });

  it("throws if a custom selectMain returns a side with no eligible unit", () => {
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("b1", "B")],
      firstSideId: "A",
      selectMain: () => "Z"
    });
    expect(() => order.activeSideId()).toThrow(IllegalActivationError);
  });
});

describe("serialize / restoreActivationOrder — state for the Combat document", () => {
  it("round-trips the order so it survives reconstruction", () => {
    const roster = [unit("a1", "A"), unit("a2", "A"), unit("b1", "B")];
    const order = createActivationOrder({ units: roster, firstSideId: "A" });
    order.activate("a1"); // default alternating -> now B's turn

    const state = order.serialize();
    expect(state.firstSideId).toBe("A");
    expect(state.activatedIds).toEqual(["a1"]);

    const restored = restoreActivationOrder({ units: roster, state });
    expect(restored.isActivated("a1")).toBe(true);
    expect(restored.activeSideId()).toBe("B");
    restored.activate("b1");
    restored.activate("a2");
    expect(restored.isComplete()).toBe(true);
  });

  it("preserves a cached bag pick across restore", () => {
    const roster = [unit("a1", "A"), unit("a2", "A"), unit("b1", "B")];
    const order = createActivationOrder({
      units: roster,
      firstSideId: "A",
      selectMain: weightedBagSelector(() => 0.99) // picks the last side (B)
    });
    expect(order.activeSideId()).toBe("B"); // caches B
    const restored = restoreActivationOrder({
      units: roster,
      selectMain: weightedBagSelector(() => 0), // a DIFFERENT rng
      state: order.serialize()
    });
    // The cached pick (B) is preserved, not re-rolled by the new selector.
    expect(restored.activeSideId()).toBe("B");
  });
});

describe("weightedBagSelector — count-weighted random draw", () => {
  it("maps the rng across each side's share, proportional to unit count", () => {
    // A has 3 units, B has 1 -> total 4. rng*4 in [0,3) -> A, [3,4) -> B.
    const select = weightedBagSelector((): number => 0.1); // 0.1*4=0.4 -> A
    expect(select(["A", "B"], { A: 3, B: 1 })).toBe("A");

    const selectB = weightedBagSelector((): number => 0.9); // 0.9*4=3.6 -> B
    expect(selectB(["A", "B"], { A: 3, B: 1 })).toBe("B");
  });

  it("drives the main tier of an activation order deterministically under a stub rng", () => {
    const rng = (() => {
      const values = [0.9, 0.0, 0.0]; // B, then A, then A
      let i = 0;
      return () => values[i++];
    })();
    const order = createActivationOrder({
      units: [
        { id: "a1", sideId: "A" },
        { id: "a2", sideId: "A" },
        { id: "b1", sideId: "B" }
      ],
      firstSideId: "A",
      selectMain: weightedBagSelector(rng)
    });

    expect(order.activeSideId()).toBe("B");
    order.activate("b1");
    expect(order.activeSideId()).toBe("A");
    order.activate("a1");
    order.activate("a2");
    expect(order.isComplete()).toBe(true);
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

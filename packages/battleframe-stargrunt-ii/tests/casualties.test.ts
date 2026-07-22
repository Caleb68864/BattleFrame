import { describe, expect, it } from "vitest";
import { allocateCasualties, type Figure } from "../src/combat/casualties";

/** A scripted rng returning queued values in [0,1), then repeating the last. */
function scriptedRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[Math.min(i, values.length - 1)];
    i += 1;
    return v;
  };
}

function roster(): Figure[] {
  return [
    { name: "A", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
    { name: "B", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
    { name: "C", armour: "d4", weaponId: "", wounds: 0, status: "ok" }
  ];
}

/**
 * B8 — allocate a resolution's wounds and kills randomly across the LIVING
 * figures. A kill drops a figure outright; a figure taking a second wound this
 * resolution dies; nothing lands on an already-dead figure; a fully-cleared unit
 * is reported wiped.
 */
describe("allocateCasualties", () => {
  it("a kill drops a living figure outright", () => {
    const rng = scriptedRng([0]); // always first living figure
    const { figures } = allocateCasualties(roster(), { wounds: 0, kills: 1 }, rng);
    expect(figures[0].status).toBe("dead");
    expect(figures[1].status).toBe("ok");
  });

  it("a single wound marks a figure wounded, not dead", () => {
    const rng = scriptedRng([0]);
    const { figures } = allocateCasualties(roster(), { wounds: 1, kills: 0 }, rng);
    expect(figures[0].status).toBe("wounded");
    expect(figures[0].wounds).toBe(1);
  });

  it("a second wound on the same figure kills it", () => {
    const rng = scriptedRng([0, 0]); // both wounds to the first figure
    const { figures } = allocateCasualties(roster(), { wounds: 2, kills: 0 }, rng);
    expect(figures[0].status).toBe("dead");
    expect(figures[0].wounds).toBe(2);
  });

  it("never lands a casualty on an already-dead figure", () => {
    const start = roster();
    start[0].status = "dead";
    start[0].wounds = 2;
    // rng always picks index 0 of the LIVING pool, which excludes the dead one.
    const rng = scriptedRng([0]);
    const { figures } = allocateCasualties(start, { wounds: 0, kills: 1 }, rng);
    expect(figures.filter((f) => f.status === "dead")).toHaveLength(2);
    expect(figures[0].status).toBe("dead"); // unchanged
  });

  it("reports a wiped unit when every figure is dead", () => {
    const rng = scriptedRng([0]); // pool shrinks each kill, index 0 each time
    const { wiped } = allocateCasualties(roster(), { wounds: 0, kills: 3 }, rng);
    expect(wiped).toBe(true);
  });

  it("does not mutate the input roster", () => {
    const input = roster();
    allocateCasualties(input, { wounds: 0, kills: 1 }, scriptedRng([0]));
    expect(input[0].status).toBe("ok");
  });
});

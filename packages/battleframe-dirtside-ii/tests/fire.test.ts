import { describe, expect, it } from "vitest";
import { resolveFire, fireReportParts, stepToBand, buildFireInput, type FireInput } from "../src/round/fire";
import type { DieType } from "../src/dice/ladder";

/**
 * G6 — the Stage-1/Stage-2 fire path, composed over INJECTED dice + drawChits so
 * it is fully unit-testable Foundry-free. measure/RollTable are wired in the glue
 * (G5); the pure resolveChitDraw stays untouched underneath.
 */

/** Fake dice: returns queued totals in order. */
function fakeDice(totals: number[]) {
  const q = [...totals];
  return {
    async roll(): Promise<{ total: number }> {
      return { total: q.shift() ?? 0 };
    },
  };
}

const sigTable: Record<number, DieType> = { 0: "d4", 1: "d6", 2: "d8", 3: "d10", 4: "d12" };

const input = (extra: Partial<FireInput> = {}): FireInput => ({
  distance: 8,
  firer: { fireControl: "enhanced", movedOverHalf: false },
  weapon: {
    class: 2,
    bands: { close: 6, medium: 12, long: 24, flatMax: 0 },
    isDffg: false,
    isArtyOrSlam: false,
    chitValidity: { close: ["R", "Y"], medium: ["R", "Y"], long: ["R"] },
  },
  target: {
    effSignature: 2,
    postureSecondaries: [],
    sigTable,
    armour: { front: 3, openTop: false },
    struckFace: "front",
    kind: "vehicle",
  },
  ...extra,
});

describe("stepToBand", () => {
  it("maps the die-shift step to a band name", () => {
    expect(stepToBand(1)).toBe("close");
    expect(stepToBand(0)).toBe("medium");
    expect(stepToBand(-1)).toBe("long");
  });
});

describe("resolveFire — out of range / auto-miss short circuits", () => {
  it("reports out of range and rolls nothing", async () => {
    const res = await resolveFire(input({ distance: 99 }), {
      dice: fakeDice([]),
      drawChits: async () => [],
    });
    expect(res.outOfRange).toBe(true);
    expect(res.hit).toBe(false);
  });

  it("auto-misses when the firer die falls off the bottom of the ladder", async () => {
    // basic d6, long -1 => d4, moved -1 => below d4 => null
    const res = await resolveFire(
      input({
        distance: 20,
        firer: { fireControl: "basic", movedOverHalf: true },
      }),
      { dice: fakeDice([]), drawChits: async () => [] }
    );
    expect(res.autoMiss).toBe(true);
    expect(res.hit).toBe(false);
  });
});

describe("resolveFire — Stage-1 opposed roll", () => {
  it("misses when the firer does not exceed the target face", async () => {
    // medium band: firer enhanced d8; target sig 2 -> d8. firer 4 vs target 6 -> miss
    const res = await resolveFire(input(), {
      dice: fakeDice([4, 6]),
      drawChits: async () => ["R9"],
    });
    expect(res.band).toBe("medium");
    expect(res.hit).toBe(false);
    expect(res.chit).toBeUndefined();
  });

  it("hits and resolves the chit draw against the struck face on a beat", async () => {
    // firer 7 vs target 5 -> hit; draw R2 + Y2 = 4 > armour 3 -> knocked-out
    const res = await resolveFire(input(), {
      dice: fakeDice([7, 5]),
      drawChits: async () => ["R2", "Y2"],
    });
    expect(res.hit).toBe(true);
    expect(res.drawn).toEqual(["R2", "Y2"]);
    expect(res.chit?.outcome).toBe("knocked-out");
  });

  it("draws weapon.class chits and applies the band's validity list", async () => {
    let requested = -1;
    const res = await resolveFire(
      input({
        weapon: {
          class: 3,
          bands: { close: 6, medium: 12, long: 24, flatMax: 0 },
          isDffg: false,
          isArtyOrSlam: false,
          chitValidity: { close: [], medium: ["R"], long: [] },
        },
        target: {
          effSignature: 2,
          postureSecondaries: [],
          sigTable,
          armour: { front: 5, openTop: false },
          struckFace: "front",
          kind: "vehicle",
        },
      }),
      {
        dice: fakeDice([8, 3]),
        drawChits: async (n) => {
          requested = n;
          return ["R2", "Y9", "R1"]; // Y invalid at medium -> contributes 0; R2+R1=3 < 5
        },
      }
    );
    expect(requested).toBe(3);
    expect(res.hit).toBe(true);
    expect(res.chit?.outcome).toBe("none");
  });
});

describe("buildFireInput — maps stored actor data + user tables to a FireInput", () => {
  it("flags DFFG/arty by weapon type and carries the bands + validity", () => {
    const fi = buildFireInput({
      distance: 5,
      firerFireControl: "superior",
      movedOverHalf: true,
      weapon: { class: 3, type: "DFFG", bands: { close: 4 }, chitValidity: { close: ["R"] } },
      dffgTypes: ["dffg"],
      artySlamTypes: ["slam", "arty"],
      targetEffSignature: 2,
      sigTable,
      targetArmour: { front: 3, openTop: false },
      struckFace: "front",
      targetKind: "vehicle",
    });
    expect(fi.weapon.isDffg).toBe(true);
    expect(fi.weapon.isArtyOrSlam).toBe(false);
    expect(fi.weapon.class).toBe(3);
    expect(fi.weapon.bands.close).toBe(4);
    expect(fi.firer.movedOverHalf).toBe(true);
    expect(fi.weapon.chitValidity.close).toEqual(["R"]);
  });
});

describe("fireReportParts — the chat card content (names escaped)", () => {
  it("builds a hit card with the damage outcome", () => {
    const res = {
      outOfRange: false,
      autoMiss: false,
      band: "medium" as const,
      firerFace: 7,
      targetFaces: [5],
      hit: true,
      drawn: ["R2", "Y2"],
      chit: { outcome: "knocked-out" as const, specials: [] },
    };
    const parts = fireReportParts(res, { firer: "T-72 <A>", target: "Grav APC" });
    expect(parts.title).toContain("T-72 &lt;A&gt;"); // escaped
    expect(parts.lines.join("")).toContain("knocked-out");
    expect(parts.cssClass).toBe("dirtside-ii-fire-report");
  });

  it("builds a miss card", () => {
    const parts = fireReportParts(
      { outOfRange: false, autoMiss: false, band: "long", firerFace: 3, targetFaces: [6], hit: false },
      { firer: "A", target: "B" }
    );
    expect(parts.lines.join("").toLowerCase()).toContain("miss");
  });

  it("escapes user-supplied chit codes drawn from the pot (no HTML injection)", () => {
    // Chit codes are USER-entered RollTable text; a code carrying HTML must not
    // reach the card markup unescaped.
    const res = {
      outOfRange: false,
      autoMiss: false,
      band: "medium" as const,
      firerFace: 7,
      targetFaces: [5],
      hit: true,
      drawn: ['<img src=x onerror="alert(1)">', "R2"],
      chit: { outcome: "knocked-out" as const, specials: [] },
    };
    const html = fireReportParts(res, { firer: "A", target: "B" }).lines.join("");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

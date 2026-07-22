import { describe, expect, it } from "vitest";
import { parseChit, resolveChitDraw, type ChitContext } from "../src/combat/chit";

/**
 * A6 — the Stage-2 chit-draw resolver (build plan §2). PURE over an injected
 * list of drawn chit codes (the live RollTable draw is glue, tested elsewhere).
 * The chit-code GRAMMAR is module-owned; the pot composition, colour meanings,
 * validity table and kill totals are ALL user-entered (no GZG data).
 */

const ctx = (extra: Partial<ChitContext> = {}): ChitContext => ({
  validity: ["R", "Y"],
  band: "medium",
  isDffg: false,
  faceArmour: 3,
  target: "vehicle",
  ...extra,
});

describe("parseChit — the chit-code grammar", () => {
  it("parses a colour+value numeric chit", () => {
    expect(parseChit("R3")).toEqual({ kind: "numeric", colour: "R", value: 3 });
    expect(parseChit("green2")).toEqual({ kind: "numeric", colour: "green", value: 2 });
  });

  it("recognises the reserved special tokens", () => {
    expect(parseChit("MOB")).toEqual({ kind: "special", token: "MOB" });
    expect(parseChit("SYS")).toEqual({ kind: "special", token: "SYS" });
    expect(parseChit("BOOM")).toEqual({ kind: "special", token: "BOOM" });
  });

  it("reports an unparseable code as unknown", () => {
    expect(parseChit("???")).toEqual({ kind: "unknown", code: "???" });
  });
});

describe("resolveChitDraw — vehicle damage vs face armour", () => {
  it("sums valid-colour values and compares to face armour", () => {
    // R2 + Y1 = 3 = faceArmour 3 → damaged
    expect(resolveChitDraw(["R2", "Y1"], ctx({ faceArmour: 3 })).outcome).toBe("damaged");
  });

  it("a total below face armour does nothing", () => {
    expect(resolveChitDraw(["R2"], ctx({ faceArmour: 3 })).outcome).toBe("none");
  });

  it("a total above face armour knocks out", () => {
    expect(resolveChitDraw(["R2", "Y2"], ctx({ faceArmour: 3 })).outcome).toBe("knocked-out");
  });

  it("invalid-colour chits COUNT as drawn but contribute 0 (no redraw)", () => {
    // G4 is not in validity [R,Y] → contributes 0; R2 alone = 2 < 3 → none
    expect(resolveChitDraw(["R2", "G4"], ctx({ faceArmour: 3 })).outcome).toBe("none");
  });
});

describe("resolveChitDraw — DFFG value scaling", () => {
  it("doubles values at close range", () => {
    // R2 → ×2 = 4 > faceArmour 3 → knocked-out
    expect(
      resolveChitDraw(["R2"], ctx({ isDffg: true, band: "close", faceArmour: 3 })).outcome
    ).toBe("knocked-out");
  });

  it("halves values at long range", () => {
    // R4 → ÷2 = 2 < faceArmour 3 → none
    expect(
      resolveChitDraw(["R4"], ctx({ isDffg: true, band: "long", faceArmour: 3 })).outcome
    ).toBe("none");
  });

  it("leaves values unscaled at medium range", () => {
    expect(
      resolveChitDraw(["R3"], ctx({ isDffg: true, band: "medium", faceArmour: 3 })).outcome
    ).toBe("damaged");
  });
});

describe("resolveChitDraw — specials", () => {
  it("collects specials against a vehicle regardless of the numeric total", () => {
    const result = resolveChitDraw(["R1", "MOB", "SYS"], ctx({ faceArmour: 5 }));
    expect(result.outcome).toBe("none"); // 1 < 5
    expect(result.specials).toEqual(["MOB", "SYS"]);
  });

  it("ignores specials against infantry", () => {
    const result = resolveChitDraw(["R3", "MOB"], ctx({ target: "infantry", killTotal: 3 }));
    expect(result.specials).toEqual([]);
  });
});

describe("resolveChitDraw — infantry kill total", () => {
  it("removes the stand when the total meets the kill threshold", () => {
    expect(
      resolveChitDraw(["R2", "Y1"], ctx({ target: "infantry", killTotal: 3 })).outcome
    ).toBe("stand-removed");
  });

  it("does nothing below the kill threshold", () => {
    expect(
      resolveChitDraw(["R2"], ctx({ target: "infantry", killTotal: 3 })).outcome
    ).toBe("none");
  });
});

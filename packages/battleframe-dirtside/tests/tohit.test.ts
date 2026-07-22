import { describe, expect, it } from "vitest";
import { firerDie, targetDie, resolveHit } from "../src/combat/tohit";
import type { DieType } from "../src/dice/ladder";

/**
 * Stage-1 — the opposed single-die to-hit. Firer die comes from fire-control
 * quality shifted by range band (and down one if it moved > half). Target die is
 * the better of its signature die and any posture secondary. Firer must EXCEED
 * the target's best face.
 */

describe("A3 firerDie — fire control, band step, movement penalty", () => {
  it("maps fire control to the base die at medium range, no movement", () => {
    expect(firerDie("basic", 0, false)).toBe("d6");
    expect(firerDie("enhanced", 0, false)).toBe("d8");
    expect(firerDie("superior", 0, false)).toBe("d10");
  });

  it("shifts up at close range (+1 step)", () => {
    expect(firerDie("basic", 1, false)).toBe("d8");
  });

  it("shifts down at long range (-1 step)", () => {
    expect(firerDie("enhanced", -1, false)).toBe("d6");
  });

  it("moving over half range shifts down one more: superior + close + moved", () => {
    // superior d10 → close +1 → d12 → moved -1 → d10
    expect(firerDie("superior", 1, true)).toBe("d10");
  });

  it("returns null when the shifts fall off the bottom of the ladder (auto-miss)", () => {
    // basic d6 → long -1 → d4 → moved -1 → below d4 → null
    expect(firerDie("basic", -1, true)).toBeNull();
  });
});

describe("A4 targetDie — best of signature and posture secondary", () => {
  const sigTable: Record<number, DieType> = { 0: "d4", 1: "d6", 2: "d8", 3: "d10", 4: "d12" };

  it("returns the signature die when there is no posture secondary", () => {
    expect(targetDie(2, [], sigTable)).toBe("d8");
  });

  it("keeps the HIGHER of the signature die and a posture secondary", () => {
    expect(targetDie(1, ["d10"], sigTable)).toBe("d10"); // secondary wins
    expect(targetDie(3, ["d6"], sigTable)).toBe("d10"); // signature wins
  });

  it("keeps the best across several posture secondaries", () => {
    expect(targetDie(0, ["d6", "d12", "d8"], sigTable)).toBe("d12");
  });

  it("returns null when the signature is off the table and no posture applies", () => {
    expect(targetDie(9, [], sigTable)).toBeNull();
  });
});

describe("A5 resolveHit — firer must exceed the target's best face", () => {
  it("misses on a tie (must exceed)", () => {
    expect(resolveHit(5, [5])).toBe(false);
  });

  it("hits when the firer beats the best target face", () => {
    expect(resolveHit(6, [5, 4])).toBe(true);
  });

  it("misses when a single target die beats the firer", () => {
    expect(resolveHit(4, [5])).toBe(false);
  });

  it("auto-hits with no target dice", () => {
    expect(resolveHit(1, [])).toBe(true);
  });
});

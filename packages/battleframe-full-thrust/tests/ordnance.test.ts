import { describe, expect, it } from "vitest";
import {
  needleInRange,
  needleHit,
  salvoIntercepted,
  salvoSurvivors,
  salvoDamage
} from "../src/combat/ordnance";

describe("needle beam", () => {
  it("reaches 9mu (FT2)", () => {
    expect(needleInRange(9)).toBe(true);
    expect(needleInRange(9.1)).toBe(false);
  });
  it("knocks out the nominated system only on a 6", () => {
    expect(needleHit(6)).toBe(true);
    expect(needleHit(5)).toBe(false);
  });
});

describe("salvo missiles", () => {
  it("intercepts with the PDS table (4-5 stop one, 6 stops two)", () => {
    expect(salvoIntercepted([6, 5, 3])).toBe(2 + 1 + 0);
  });

  it("computes survivors as missiles-on-target minus interceptions, floored at 0", () => {
    expect(salvoSurvivors(6, 2)).toBe(4);
    expect(salvoSurvivors(2, 5)).toBe(0);
  });

  it("sums each surviving missile's damage die (screens do not reduce)", () => {
    // 6 = 6 damage, no reroll; just sum the faces.
    expect(salvoDamage([6, 3, 1])).toBe(10);
  });
});

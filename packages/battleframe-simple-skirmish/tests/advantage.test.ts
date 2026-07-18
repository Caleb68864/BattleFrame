import { describe, expect, it } from "vitest";
import { alterDie, netAdvantage } from "../src/combat/advantage";

describe("netAdvantage -- both sides' points cancel; the remainder is the net", () => {
  it("gives the net to the attacker when they have more", () => {
    expect(netAdvantage({ attacker: 2, defender: 1 })).toEqual({ beneficiary: "attacker", points: 1 });
  });

  it("gives the net to the defender when they have more", () => {
    expect(netAdvantage({ attacker: 1, defender: 3 })).toEqual({ beneficiary: "defender", points: 2 });
  });

  it("cancels to nobody when equal", () => {
    expect(netAdvantage({ attacker: 2, defender: 2 })).toEqual({ beneficiary: "none", points: 0 });
  });
});

describe("alterDie -- one net point alters one die result by one, within the die's faces", () => {
  it("raises and lowers within 1..dieSize", () => {
    expect(alterDie(4, 1, 6)).toBe(5);
    expect(alterDie(4, -1, 6)).toBe(3);
  });

  it("clamps at the die's bounds", () => {
    expect(alterDie(6, 1, 6)).toBe(6);
    expect(alterDie(1, -1, 6)).toBe(1);
    expect(alterDie(8, 1, 8)).toBe(8);
  });
});

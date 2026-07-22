import { describe, expect, it } from "vitest";
import { impactOutcome } from "../src/combat/impact";

/**
 * B5 — Impact vs Armour. Strict `>`: an impact equal to (or below) the armour
 * bounces; above it wounds; above TWICE it kills. The `2*armour` boundary is a
 * wound, not a kill (strict `>`).
 */
describe("impactOutcome", () => {
  it("no effect when impact <= armour", () => {
    expect(impactOutcome(3, 5)).toBe("none");
    expect(impactOutcome(5, 5)).toBe("none");
  });

  it("wounds when impact exceeds armour", () => {
    expect(impactOutcome(6, 5)).toBe("wound");
    expect(impactOutcome(9, 5)).toBe("wound");
  });

  it("kills when impact exceeds twice the armour", () => {
    expect(impactOutcome(11, 5)).toBe("kill");
  });

  it("treats impact === 2*armour as a wound (strict >)", () => {
    expect(impactOutcome(10, 5)).toBe("wound");
    expect(impactOutcome(11, 5)).toBe("kill");
  });
});

import { describe, expect, it } from "vitest";
import {
  applyCommandLoss,
  resolveRally,
  stepConfidence,
  type ForceC3,
} from "../src/round/c3";

/**
 * A11 — the flattened C3 (command & control) force state. Destroying a command
 * element ripples to the whole force: every unit loses one confidence level and
 * the force can neither launch new offensives nor rally until re-established.
 * This is the concrete test of the two-tier bet (plan risk #4): a command
 * ELEMENT's death changes the whole FORCE's state.
 */

const force = (): ForceC3 => ({
  units: [
    { id: "u1", confidence: "confident" },
    { id: "u2", confidence: "steady" },
    { id: "u3", confidence: "broken" },
  ],
  noNewOffensives: false,
  noRally: false,
});

describe("stepConfidence — the confidence ladder, clamped at both ends", () => {
  it("steps down toward broken and up toward confident", () => {
    expect(stepConfidence("confident", -1)).toBe("steady");
    expect(stepConfidence("steady", 1)).toBe("confident");
  });
  it("clamps at broken and confident", () => {
    expect(stepConfidence("broken", -1)).toBe("broken");
    expect(stepConfidence("confident", 1)).toBe("confident");
  });
});

describe("applyCommandLoss — the force-wide ripple", () => {
  it("drops every unit one confidence level", () => {
    const after = applyCommandLoss(force());
    expect(after.units.map((u) => u.confidence)).toEqual(["steady", "shaken", "broken"]);
  });

  it("forbids new offensives and rallying", () => {
    const after = applyCommandLoss(force());
    expect(after.noNewOffensives).toBe(true);
    expect(after.noRally).toBe(true);
  });

  it("does not mutate the input force", () => {
    const original = force();
    applyCommandLoss(original);
    expect(original.units[0].confidence).toBe("confident");
    expect(original.noNewOffensives).toBe(false);
  });
});

describe("resolveRally — quality roll vs (rallied LR + command LR)", () => {
  it("rallies (+1 CL) when the roll beats the combined bar", () => {
    // bar = 2 + 1 = 3; roll 5 > 3
    expect(resolveRally(5, 2, 1)).toEqual({ rallied: true, clDelta: 1, spentActivation: true });
  });

  it("fails (no CL change) when the roll does not beat the bar", () => {
    // bar = 3; roll 3 is not > 3
    expect(resolveRally(3, 2, 1)).toEqual({ rallied: false, clDelta: 0, spentActivation: true });
  });

  it("always spends the activation, pass or fail", () => {
    expect(resolveRally(1, 5, 5).spentActivation).toBe(true);
    expect(resolveRally(12, 0, 0).spentActivation).toBe(true);
  });
});

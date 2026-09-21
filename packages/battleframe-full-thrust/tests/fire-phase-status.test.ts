/**
 * Visible fire-phase turn tracker (roadmap P1 #12): a readable status line for
 * "whose side fires next + how many of its ships are left", surfaced to all
 * players so the alternation is visible instead of a GM-only toast of a raw
 * disposition number.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sideLabel, firePhaseStatusLine } from "../src/round/fire-session";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


function fakeOrder(active: string | undefined, eligible: string[], complete = false) {
  return {
    activeSideId: () => active,
    eligible: (_side: string) => eligible,
    activate: () => {},
    isComplete: () => complete,
    serialize: () => ({ firstSideId: active ?? "", activatedIds: [], priorityPointer: 0, mainPointer: 0 })
  };
}

describe("sideLabel", () => {
  it("maps Foundry dispositions to readable side names", () => {
    expect(sideLabel("1")).toBe("Friendly");
    expect(sideLabel("-1")).toBe("Hostile");
    expect(sideLabel("0")).toBe("Neutral");
    expect(sideLabel("-2")).toBe("Secret");
  });

  it("falls back to a generic label for an unknown side id", () => {
    expect(sideLabel("7")).toBe("Side 7");
  });
});

describe("firePhaseStatusLine", () => {
  it("names the active side and its remaining eligible ships", () => {
    const line = firePhaseStatusLine(fakeOrder("-1", ["a", "b"]));
    expect(line).toContain("Hostile");
    expect(line).toContain("2");
  });

  it("reports completion when the order is complete", () => {
    expect(firePhaseStatusLine(fakeOrder(undefined, [], true)).toLowerCase()).toContain("complete");
  });

  it("treats a missing active side as complete", () => {
    expect(firePhaseStatusLine(fakeOrder(undefined, [])).toLowerCase()).toContain("complete");
  });
});

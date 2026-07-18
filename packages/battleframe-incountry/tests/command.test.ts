import { describe, expect, it } from "vitest";
import {
  controlPointsFor,
  resolveInitiative,
  type CommandChoice
} from "../src/round/command";
import { rollSuppresses, highestSurvivingMorale } from "../src/round/suppression";

/**
 * Command phase: both sides reveal a command choice; the LOWER initiative wins
 * (INX low-goes-first). CP gained = the choice's control value. Suppression is
 * INX's morale: a d10 over the best surviving morale suppresses the unit.
 */

describe("resolveInitiative — lower initiative wins", () => {
  it("the lower number takes initiative", () => {
    const choices: CommandChoice[] = [
      { sideId: "A", initiative: 3, control: 3 },
      { sideId: "B", initiative: 1, control: 1 }
    ];
    expect(resolveInitiative(choices)).toEqual({ winner: "B" });
  });

  it("reports a tie when the lowest initiative is shared (caller rolls off)", () => {
    const choices: CommandChoice[] = [
      { sideId: "A", initiative: 2, control: 2 },
      { sideId: "B", initiative: 2, control: 2 }
    ];
    expect(resolveInitiative(choices)).toEqual({ tie: true });
  });
});

describe("controlPointsFor — CP from the chosen card", () => {
  it("is the control value of the choice", () => {
    expect(controlPointsFor({ sideId: "A", initiative: 3, control: 3 })).toBe(3);
  });

  it("adds the Close Out bonus of +2 when that side LOST initiative", () => {
    // Close Out grants +2 CP to its player when they lose initiative.
    expect(
      controlPointsFor({ sideId: "A", initiative: 2, control: 1, bonusOnLosingInitiative: 2 }, false)
    ).toBe(3);
  });

  it("does not add the Close Out bonus when that side WON initiative", () => {
    expect(
      controlPointsFor({ sideId: "A", initiative: 2, control: 1, bonusOnLosingInitiative: 2 }, true)
    ).toBe(1);
  });
});

describe("suppression — the morale system", () => {
  it("suppresses when the d10 exceeds the best surviving morale", () => {
    expect(rollSuppresses(7, 6)).toBe(true);
  });

  it("does not suppress when the roll ties or falls under morale", () => {
    expect(rollSuppresses(6, 6)).toBe(false);
    expect(rollSuppresses(4, 6)).toBe(false);
  });

  it("reads the best morale among survivors", () => {
    expect(highestSurvivingMorale([4, 8, 6])).toBe(8);
  });

  it("returns null best morale for a wiped unit (nothing to suppress)", () => {
    expect(highestSurvivingMorale([])).toBeNull();
  });
});

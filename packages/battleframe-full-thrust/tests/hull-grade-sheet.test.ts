import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import langEn from "../lang/en.json";
import { createShipDataClass } from "../src/data/ship";
import { prepareHullGradeOptions } from "../src/sheets/ship-sheet";
import { HULL_GRADES } from "../src/constants";
import { hullBoxesForGrade } from "../src/ship/variable-hull";
import { shipClass, thresholdRows, warshipDamagePoints } from "../src/ship/hull";
import { SCENARIO_RULES, withRules } from "./helpers/world";

// Roadmap P2 #19: the Fleet Book variable hull was reachable through fleet import
// only. The ship sheet now picks the grade, and the hull track follows it the
// same way import derives it.

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
});

const lang = langEn as Record<string, string>;

class Base {}

function ship(system: Record<string, any>) {
  const Data = createShipDataClass(Base as never) as any;
  return Object.assign(new Data(), system);
}

describe("the ship sheet offers the hull grade", () => {
  it("lists the fixed rule and every grade, marking the current one, with localized names", () => {
    const options = prepareHullGradeOptions("strong");

    expect(options.map((o) => o.value)).toEqual(["", ...HULL_GRADES]);
    expect(options.filter((o) => o.selected).map((o) => o.value)).toEqual(["strong"]);
    for (const option of options) {
      expect(lang[option.label], option.label).toBeTypeOf("string");
    }
    expect(prepareHullGradeOptions(undefined).find((o) => o.selected)?.value).toBe("");
  });

  it("the template renders the select bound to system.hullGrade", () => {
    const template = readFileSync(resolve(__dirname, "../templates/ship-sheet.hbs"), "utf8");

    expect(template).toMatch(/<select name="system\.hullGrade"/);
    expect(template).toContain("{{#each hullGrades}}");
  });
});

describe("choosing a grade resizes the hull track", () => {
  it("picking a grade sizes the track from the ship's mass, as import does", async () => {
    const data = ship({ mass: 50, hullGrade: "", hull: { boxes: 25, rows: 3, damage: 0 } });
    const changes: any = { system: { hullGrade: "strong" } };

    await data._preUpdate(changes, {}, {});

    expect(changes.system.hull).toMatchObject({
      boxes: hullBoxesForGrade(50, "strong"),
      rows: SCENARIO_RULES.variableHullRows
    });
  });

  it("clearing the grade goes back to the fixed track", async () => {
    const data = ship({ mass: 50, hullGrade: "strong", hull: { boxes: 99, rows: 9, damage: 0 } });
    const changes: any = { system: { hullGrade: "" } };

    await data._preUpdate(changes, {}, {});

    expect(changes.system.hull).toMatchObject({
      boxes: warshipDamagePoints(50),
      rows: thresholdRows(shipClass(50))
    });
  });

  it("a mass change re-sizes a graded hull, and handles the sheet's full-form submit", async () => {
    const data = ship({ mass: 50, hullGrade: "weak", hull: { boxes: hullBoxesForGrade(50, "weak"), rows: 4, damage: 0 } });
    // A form submit sends every field, unchanged ones included.
    const changes: any = { system: { mass: 80, hullGrade: "weak", hull: { boxes: data.hull.boxes, rows: 4, damage: 0 } } };

    await data._preUpdate(changes, {}, {});

    expect(changes.system.hull.boxes).toBe(hullBoxesForGrade(80, "weak"));
  });

  it("keeps damage within the new track", async () => {
    const data = ship({ mass: 50, hullGrade: "super", hull: { boxes: 40, rows: 4, damage: 30 } });
    const changes: any = { "system.hullGrade": "fragile" };

    await data._preUpdate(changes, {}, {});

    expect(changes["system.hull.boxes"]).toBe(hullBoxesForGrade(50, "fragile"));
    expect(changes["system.hull.damage"]).toBe(hullBoxesForGrade(50, "fragile"));
  });

  it("leaves the hull alone when the grade does not change, or the box count is typed in", async () => {
    const same = ship({ mass: 50, hullGrade: "strong", hull: { boxes: 7, rows: 2, damage: 0 } });
    const sameChanges: any = { system: { hullGrade: "strong", hull: { boxes: 7, rows: 2, damage: 0 } } };
    await same._preUpdate(sameChanges, {}, {});
    expect(sameChanges.system.hull).toEqual({ boxes: 7, rows: 2, damage: 0 });

    const typed = ship({ mass: 50, hullGrade: "", hull: { boxes: 25, rows: 3, damage: 0 } });
    const typedChanges: any = { system: { hullGrade: "strong", hull: { boxes: 12 } } };
    await typed._preUpdate(typedChanges, {}, {});
    expect(typedChanges.system.hull.boxes).toBe(12);

    const fixed = ship({ mass: 50, hullGrade: "", hull: { boxes: 25, rows: 3, damage: 0 } });
    const massOnly: any = { system: { mass: 60 } };
    await fixed._preUpdate(massOnly, {}, {});
    expect(massOnly).toEqual({ system: { mass: 60 } });
  });
});

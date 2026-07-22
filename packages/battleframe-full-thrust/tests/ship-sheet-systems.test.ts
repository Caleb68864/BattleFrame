/**
 * Visual SSD system pip rows (roadmap P1 #10 remainder): the ship sheet renders
 * FCS / PDS / screens each as a small row of clickable pips (design total, the
 * first `lost` crossed off) alongside the fallback number inputs.
 * `prepareSystemPips` is the pure view-model shared by all three; the click
 * handler `onToggleSystemPip` reads `data-system` + `data-number` and sets the
 * matching `…Lost` counter, mirroring the hull-box fill/unfill exactly.
 */

import { describe, expect, it } from "vitest";
import { prepareSystemPips, onToggleSystemPip } from "../src/sheets/ship-sheet";

describe("prepareSystemPips", () => {
  it("marks the first `lost` pips lost and the rest intact", () => {
    const pips = prepareSystemPips(3, 1) as any[];
    expect(pips).toHaveLength(3);
    expect(pips[0].lost).toBe(true);
    expect(pips[1].lost).toBe(false);
    expect(pips[2].lost).toBe(false);
    // each pip carries its 1-based index for the click target
    expect(pips[0].index).toBe(1);
    expect(pips[2].index).toBe(3);
  });

  it("handles zero design and clamps lost above the design count", () => {
    expect(prepareSystemPips(0, 0)).toHaveLength(0);
    const over = prepareSystemPips(3, 99) as any[];
    expect(over.every((p) => p.lost)).toBe(true);
  });
});

describe("onToggleSystemPip", () => {
  function fakeApp(system: Record<string, number>) {
    const updates: any[] = [];
    return {
      updates,
      actor: {
        system,
        update: (data: any) => {
          updates.push(data);
          return Promise.resolve();
        }
      }
    };
  }

  it("clicking an intact fcs pip marks it and beyond as lost", async () => {
    const app = fakeApp({ fcs: 3, fcsLost: 0 });
    // click pip number 2 for fcs → lost through 2
    await onToggleSystemPip.call(app, {}, { dataset: { system: "fcs", number: "2" } });
    expect(app.updates[0]["system.fcsLost"]).toBe(2);
  });

  it("clicking a lost fcs pip un-marks it and beyond", async () => {
    const app = fakeApp({ fcs: 3, fcsLost: 3 });
    // pip 2 is lost (lost=3 ≥ 2) → clicking it sets fcsLost to 1
    await onToggleSystemPip.call(app, {}, { dataset: { system: "fcs", number: "2" } });
    expect(app.updates[0]["system.fcsLost"]).toBe(1);
  });

  it("writes the pds counter for a pds pip", async () => {
    const app = fakeApp({ pds: 2, pdsLost: 0 });
    await onToggleSystemPip.call(app, {}, { dataset: { system: "pds", number: "1" } });
    expect(app.updates[0]["system.pdsLost"]).toBe(1);
  });

  it("writes the screens counter for a screen pip", async () => {
    const app = fakeApp({ screens: 3, screensLost: 0 });
    await onToggleSystemPip.call(app, {}, { dataset: { system: "screens", number: "3" } });
    expect(app.updates[0]["system.screensLost"]).toBe(3);
  });

  it("ignores a click with an unknown system", async () => {
    const app = fakeApp({ fcs: 3, fcsLost: 0 });
    await onToggleSystemPip.call(app, {}, { dataset: { system: "bogus", number: "1" } });
    expect(app.updates).toHaveLength(0);
  });

  it("ignores a click with no valid pip number", async () => {
    const app = fakeApp({ fcs: 3, fcsLost: 0 });
    await onToggleSystemPip.call(app, {}, { dataset: { system: "fcs" } });
    expect(app.updates).toHaveLength(0);
  });
});

import { describe, expect, it, vi } from "vitest";
import { chitCodeOf, chitCodesFromResults, drawChits } from "../src/round/chit-pot";

/**
 * G5 — the chit-pot draw glue over a Foundry RollTable. The pure code-extraction
 * (chitCodeOf / chitCodesFromResults) is unit-tested; drawChits itself touches a
 * RollTable and is on the parent's live-verify list (confirm drawMany honours
 * without-replacement + reset returns chits to the pot headlessly).
 */

describe("chitCodeOf — reads the code string off a TableResult", () => {
  it("prefers text, then description, then name", () => {
    expect(chitCodeOf({ text: "R3" })).toBe("R3");
    expect(chitCodeOf({ description: "Y1" })).toBe("Y1");
    expect(chitCodeOf({ name: "MOB" })).toBe("MOB");
  });
  it("trims surrounding whitespace", () => {
    expect(chitCodeOf({ text: "  G2 " })).toBe("G2");
  });
  it("returns empty string for an empty result", () => {
    expect(chitCodeOf({})).toBe("");
  });
});

describe("chitCodesFromResults — maps a drawn result set to codes", () => {
  it("extracts a code per result", () => {
    expect(chitCodesFromResults([{ text: "R2" }, { text: "MOB" }])).toEqual(["R2", "MOB"]);
  });
});

describe("drawChits — RollTable drawMany + reset", () => {
  it("draws n without replacement then resets the pot", async () => {
    const drawMany = vi.fn(async () => ({ results: [{ text: "R2" }, { text: "Y1" }] }));
    const reset = vi.fn(async () => undefined);
    const table = { replacement: true, drawMany, reset, update: vi.fn(async () => undefined) };

    const codes = await drawChits(table as any, 2);

    expect(codes).toEqual(["R2", "Y1"]);
    expect(drawMany).toHaveBeenCalledWith(2, { displayChat: false });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("returns empty when the table cannot draw", async () => {
    expect(await drawChits(undefined as any, 2)).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { gatherUnitsFromCanvas as simpleSkirmish } from "../../battleframe-simple-skirmish/src/ui/round-control";
import { gatherUnitsFromCanvas as inCountry } from "../../battleframe-incountry/src/ui/round-control";
import { gatherUnitsFromCanvas as stargrunt } from "../../battleframe-stargrunt-ii/src/ui/round-control";
import { gatherKnightsFromCanvas as greathelm } from "../../battleframe-greathelm/src/ui/round-control";

/**
 * A ruleset's units are keyed by TOKEN, not actor (2026-11-21). An unlinked
 * token's synthetic actor shares its base actor's id, so two tokens dropped from
 * one actor collapsed into a single unit: activating one used the other's turn.
 * Simple Skirmish and InCountry were fixed first; Stargrunt II and GREATHELM had
 * the same keying. (Dirtside II keys units by their `unitId` flag, not by token.)
 */

afterEach(() => vi.unstubAllGlobals());

describe.each([
  { name: "Simple Skirmish", type: "battleframe-simple-skirmish.unit", gather: simpleSkirmish },
  { name: "InCountry", type: "battleframe-incountry.unit", gather: inCountry },
  { name: "Stargrunt II", type: "battleframe-stargrunt-ii.unit", gather: stargrunt },
  { name: "GREATHELM", type: "battleframe-greathelm.knight", gather: greathelm }
])("$name", ({ type, gather }) => {
  it("two unlinked tokens of one actor are two units", () => {
    const actor = { id: "actor-1", name: "Squad", type, system: { models: 1, modelsRemaining: 1 } };
    vi.stubGlobal("game", { settings: { get: () => undefined } });
    vi.stubGlobal("canvas", {
      scene: { id: "s", grid: { size: 100, distance: 1, units: "in" } },
      tokens: {
        placeables: [
          { id: "tok-1", name: "Squad", center: { x: 0, y: 0 }, document: { id: "tok-1", disposition: 1 }, actor },
          { id: "tok-2", name: "Squad", center: { x: 0, y: 0 }, document: { id: "tok-2", disposition: 1 }, actor }
        ]
      }
    });

    const ids = (gather() as { id: string }[]).map((u) => u.id);
    expect(new Set(ids).size).toBe(2);
  });
});

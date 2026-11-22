import { afterEach, describe, expect, it, vi } from "vitest";
import { gatherUnitsFromCanvas as simpleSkirmish } from "../../battleframe-simple-skirmish/src/ui/round-control";
import { gatherUnitsFromCanvas as inCountry } from "../../battleframe-incountry/src/ui/round-control";
import { gatherUnitsFromCanvas as stargrunt } from "../../battleframe-stargrunt-ii/src/ui/round-control";
import { gatherUnitsFromCanvas as dirtside } from "../../battleframe-dirtside-ii/src/ui/round-control";
import { gatherKnightsFromCanvas as greathelm } from "../../battleframe-greathelm/src/ui/round-control";
import { registerBattleframeSettings } from "../src/settings";

/**
 * Decided by agent 2026-11-21 (owner may revisit): every ruleset read any token
 * that was not hostile as friendly, so a NEUTRAL token (a bystander, an
 * objective marker) joined the friendly side, rolled initiative and counted for
 * victory. By default a neutral token now takes no part; the world setting
 * `battleframe.neutralTokens` = "friendly" restores the old behaviour. SECRET
 * tokens still fight as hostile, as before.
 */

afterEach(() => vi.unstubAllGlobals());

const RULESETS = [
  { name: "Simple Skirmish", type: "battleframe-simple-skirmish.unit", gather: simpleSkirmish },
  { name: "InCountry", type: "battleframe-incountry.unit", gather: inCountry },
  { name: "Stargrunt II", type: "battleframe-stargrunt-ii.unit", gather: stargrunt },
  { name: "GREATHELM", type: "battleframe-greathelm.knight", gather: greathelm },
  { name: "Dirtside II", type: "battleframe-dirtside-ii.vehicle", gather: dirtside }
];

function token(id: string, type: string, disposition: number) {
  const actor = {
    id: `actor-${id}`,
    name: id,
    type,
    system: { models: 1, modelsRemaining: 1 },
    getFlag: (_scope: string, key: string) => (key === "unitId" ? `unit-${id}` : undefined),
    flags: {}
  };
  return { id, name: id, center: { x: 0, y: 0 }, document: { id, disposition }, actor };
}

function world(neutralTokens: string | undefined, type: string) {
  vi.stubGlobal("game", {
    settings: { get: (ns: string, key: string) => (ns === "battleframe" && key === "neutralTokens" ? neutralTokens : undefined) },
    actors: { get: (id: string) => ({ id, name: id }) }
  });
  vi.stubGlobal("canvas", {
    scene: { id: "s", grid: { size: 100, distance: 1, units: "in" } },
    tokens: { placeables: [token("f", type, 1), token("h", type, -1), token("n", type, 0), token("s", type, -2)] }
  });
}

const sides = (units: { playerId?: string; sideId?: string }[]) => units.map((u) => u.playerId ?? u.sideId);

describe.each(RULESETS)("$name: who takes part", ({ type, gather }) => {
  it("leaves neutral tokens out by default; secret tokens fight as hostile", () => {
    world(undefined, type);
    expect(sides(gather() as never).sort()).toEqual(["friendly", "hostile", "hostile"]);
  });

  it("the world setting can put neutral tokens back on the friendly side", () => {
    world("friendly", type);
    expect(sides(gather() as never).sort()).toEqual(["friendly", "friendly", "hostile", "hostile"]);
  });
});

it("the engine registers the setting, defaulting to leaving neutral tokens out", () => {
  const register = vi.fn();
  vi.stubGlobal("game", { settings: { register, registerMenu: vi.fn() } });
  registerBattleframeSettings();
  const call = register.mock.calls.find((c) => c[1] === "neutralTokens");
  expect(call?.[2]).toMatchObject({ scope: "world", config: true, default: "exclude" });
  expect(Object.keys(call?.[2].choices ?? {})).toEqual(["exclude", "friendly"]);
});

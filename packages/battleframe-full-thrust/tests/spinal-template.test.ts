import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAreaApi } from "../../battleframe/src/areas/area";
import { facingOf } from "../../battleframe/src/measurement/facing";
import { novaTemplateSegments, waveGunTemplateSegments } from "../src/combat/spinal-template";
import { buildSpinalReportHtml, fireNovaCannonAction, fireWaveGunAction } from "../src/ui/round-control";
import { SCENARIO_RULES, withRules } from "./helpers/world";

// Roadmap P2 #20: the Nova Cannon and Wave Gun tools resolved against whatever
// ship was targeted. The Nova rolled its first-turn dice at any range and bearing;
// the Wave Gun checked range only, so a ship astern was hit. Both weapons fire
// straight ahead along the centreline, so a target now has to be under the
// template (the engine's capsule area). Centre containment: the scene is in mu,
// as the module's own scenes are, and the engine cannot size a base in mu.

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

const SCENE = { grid: { size: 100, distance: 5, units: "mu" } };
const PX = 20; // px per mu on SCENE

/** A ship token at (x, y) mu, facing `rotation` degrees (0 = up the screen). Its base flag is in mm, which a mu scene cannot size. */
function ship(id: string, xMu: number, yMu: number, rotation = 0, disposition = 1) {
  return {
    id,
    name: id,
    center: { x: xMu * PX, y: yMu * PX },
    scene: SCENE,
    document: {
      disposition,
      rotation,
      width: 1,
      height: 1,
      flags: { battleframe: { base: { shape: "circle", widthMm: 25.4, heightMm: 25.4 } } }
    },
    actor: {
      type: "battleframe-full-thrust.ship",
      system: { weapons: [], hull: { boxes: 20, damage: 0, rows: 4 } },
      update: vi.fn(),
      toggleStatusEffect: vi.fn(),
      getFlag: vi.fn(() => 99),
      setFlag: vi.fn()
    }
  };
}

function world(target: ReturnType<typeof ship>) {
  const rollPool = vi.fn(async (n: number) => Array.from({ length: n }, () => 1));
  const create = vi.fn(async (_data: any) => undefined);
  const attacker = ship("a1", 100, 100, 0);
  const order = {
    activeSideId: () => "1",
    isComplete: () => false,
    eligible: () => ["a1"],
    activate: vi.fn(),
    toState: () => ({})
  };
  vi.stubGlobal("game", {
    ...(globalThis as any).game,
    user: { isGM: true, targets: { first: () => target } },
    i18n: { format: (k: string) => `[${k}]`, localize: (k: string) => `[${k}]` },
    battleframe: {
      measure: {
        between: (a: any, b: any) => ({ distance: Math.hypot(b.center.x - a.center.x, b.center.y - a.center.y) / PX })
      },
      facing: { bearingOf: () => 0, facingOf },
      areas: createAreaApi(),
      dice: { rollPool },
      rounds: { createActivationOrder: vi.fn(() => order), restoreActivationOrder: vi.fn(() => order) }
    },
    combats: { active: undefined }
  });
  vi.stubGlobal("canvas", {
    tokens: { controlled: [attacker], placeables: [attacker, target] },
    scene: { ...SCENE, getFlag: () => ({ running: true }), setFlag: vi.fn(), unsetFlag: vi.fn() }
  });
  vi.stubGlobal("ChatMessage", { create, getSpeaker: () => ({}) });
  vi.stubGlobal("ui", { notifications: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } });
  vi.stubGlobal("foundry", undefined);
  return { rollPool, create };
}

describe("the template segments come from the world's profile", () => {
  it("the Nova's first turn runs from its arming point for one turn's travel", () => {
    const [segment] = novaTemplateSegments(1);
    expect(segment).toEqual({
      startMu: SCENARIO_RULES.novaCannonArmingOffsetMu,
      endMu: SCENARIO_RULES.novaCannonArmingOffsetMu + SCENARIO_RULES.novaCannonTravelMuByTurn[0],
      radiusMu: SCENARIO_RULES.novaCannonTemplateInchesByTurn[0] / 2
    });
    expect(novaTemplateSegments(SCENARIO_RULES.novaCannonLifeTurns + 1)).toEqual([]);
  });

  it("the Wave Gun widens band by band out to its reach", () => {
    const band = SCENARIO_RULES.waveGunBandMu;
    expect(waveGunTemplateSegments()).toEqual(
      SCENARIO_RULES.waveGunTemplateInchesByBand.map((inches, i) => ({
        startMu: i * band,
        endMu: Math.min((i + 1) * band, SCENARIO_RULES.waveGunMaxRangeMu),
        radiusMu: inches / 2
      }))
    );
  });
});

describe("a spinal weapon only hits a ship under its template", () => {
  // The attacker sits at (100, 100) mu facing up the screen (-y).
  it("Nova Cannon: a ship dead ahead inside its first sweep is hit", async () => {
    const w = world(ship("b1", 100, 100 - 15, 0, -1));
    await fireNovaCannonAction();
    expect(w.rollPool).toHaveBeenCalledTimes(1);
  });

  it("Nova Cannon: a ship astern, abeam, or short of the arming point is not", async () => {
    for (const [x, y] of [
      [100, 115],
      [115, 100],
      [100, 100 - 2]
    ]) {
      const w = world(ship("b1", x, y, 0, -1));
      await fireNovaCannonAction();
      expect(w.rollPool, `target at (${x}, ${y})`).not.toHaveBeenCalled();
      expect(w.create.mock.calls[0][0].content).toContain("battleframe-full-thrust.report.notInTemplate");
    }
  });

  it("Wave Gun: a ship ahead in range is hit, one astern in range is not", async () => {
    const ahead = world(ship("b1", 100, 100 - 10, 0, -1));
    await fireWaveGunAction();
    expect(ahead.rollPool).toHaveBeenCalledTimes(1);

    const astern = world(ship("b1", 100, 100 + 10, 0, -1));
    await fireWaveGunAction();
    expect(astern.rollPool).not.toHaveBeenCalled();
  });

  it("the miss card names the template, localized", () => {
    (globalThis as any).game.i18n = { format: (k: string) => `[${k}]`, localize: (k: string) => `[${k}]` };
    const html = buildSpinalReportHtml(
      { weapon: "Nova Cannon", notInTemplate: true, distance: 1, totalDamage: 0, thresholdsCrossed: [], systemsKnockedOut: 0, destroyed: false } as any,
      "B"
    );
    expect(html).toContain("[battleframe-full-thrust.report.notInTemplate]");
  });
});

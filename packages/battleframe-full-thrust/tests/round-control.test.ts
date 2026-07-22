import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFireReportHtml,
  buildFighterReportHtml,
  buildNeedleReportHtml,
  buildTargetingReportHtml,
  addSceneControl,
  registerRoundControl,
  executeManeuversAction,
  beginFirePhaseAction,
  newTurnAction
} from "../src/ui/round-control";
import type { TargetingRow } from "../src/combat/targeting";
import { buildSplitFireReportHtml, buildMissileReportHtml, buildSpinalReportHtml } from "../src/ui/round-control";
import type { FireShipSplitReport } from "../src/combat/fire-ship-split";
import type { FireReport } from "../src/combat/fire-ship";
import type { FighterFireReport } from "../src/combat/fire-fighters";

afterEach(() => vi.unstubAllGlobals());

function report(overrides: Partial<FireReport> = {}): FireReport {
  return {
    distance: 10,
    bearing: 0,
    totalDamage: 3,
    shots: [{ index: 0, kind: "beam", fired: true, damage: 3 }],
    destroyed: false,
    thresholdsCrossed: [],
    systemsKnockedOut: 0,
    ...overrides
  };
}

describe("buildFireReportHtml", () => {
  it("summarises the range, damage and attacker/target names", () => {
    const html = buildFireReportHtml(report(), { attacker: "RNS Lion", target: "Enemy DD" });
    expect(html).toContain("RNS Lion");
    expect(html).toContain("Enemy DD");
    expect(html).toContain("3"); // damage
  });

  it("notes destruction when the target is destroyed", () => {
    const html = buildFireReportHtml(report({ destroyed: true }), { attacker: "A", target: "B" });
    expect(html.toLowerCase()).toContain("destroyed");
  });

  it("notes threshold system losses", () => {
    const html = buildFireReportHtml(
      report({ thresholdsCrossed: [1], systemsKnockedOut: 2 }),
      { attacker: "A", target: "B" }
    );
    expect(html.toLowerCase()).toContain("threshold");
    expect(html).toContain("2");
  });

  it("escapes ship names (never injects raw HTML)", () => {
    const html = buildFireReportHtml(report(), { attacker: "<img src=x onerror=alert(1)>", target: "B" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

import { resolveMovementPath, pixelsPerMu } from "../src/ui/round-control";

describe("pixelsPerMu", () => {
  it("converts scene grid units to pixels per mu", () => {
    expect(pixelsPerMu({ size: 50, distance: 1 })).toBe(50); // 1mu = 1in, 50px/in
    expect(pixelsPerMu({ size: 100, distance: 2 })).toBe(50);
  });
  it("falls back to 1 when the grid is unusable (never divides by zero)", () => {
    expect(pixelsPerMu({ size: 0, distance: 0 })).toBe(1);
    expect(pixelsPerMu(undefined)).toBe(1);
  });
});

describe("resolveMovementPath", () => {
  it("reads velocity/course/thrust off the ship system and returns the traced path", () => {
    const path = resolveMovementPath({ velocity: 10, course: 3, thrust: 6 }, "P3");
    expect(path.legal).toBe(true);
    expect(path.course).toBe(12);
    expect(path.end.dy).toBeCloseTo(-7.5, 2);
  });
  it("reports an illegal order", () => {
    const path = resolveMovementPath({ velocity: 0, course: 6, thrust: 6 }, "S4");
    expect(path.legal).toBe(false);
    expect(path.reason).toBe("turn-cap");
  });
});

describe("buildFighterReportHtml", () => {
  const base: FighterFireReport = {
    fired: true,
    distance: 5,
    totalDamage: 4,
    destroyed: false,
    thresholdsCrossed: [],
    systemsKnockedOut: 0,
    pdsKills: 0
  };

  it("summarises a fighter group's attack", () => {
    const html = buildFighterReportHtml(base, { attacker: "Alpha Wing", target: "Enemy CA" });
    expect(html).toContain("Alpha Wing");
    expect(html).toContain("fighters");
    expect(html).toContain("4");
  });

  it("reports when the group could not attack, escaping the reason", () => {
    const html = buildFighterReportHtml(
      { ...base, fired: false, reason: "out-of-range" },
      { attacker: "A", target: "B" }
    );
    expect(html).toContain("out-of-range");
  });
});

describe("buildNeedleReportHtml", () => {
  it("reports a knocked-out system on a hit", () => {
    const html = buildNeedleReportHtml(
      { fired: true, hit: true, systemType: "fcs" },
      { attacker: "Sniper", target: "Foe" }
    );
    expect(html).toContain("Sniper");
    expect(html).toContain("fcs");
    expect(html.toLowerCase()).toContain("knocked out");
  });
  it("reports a no-strike reason (escaped)", () => {
    const html = buildNeedleReportHtml(
      { fired: false, hit: false, systemType: "drive", reason: "out-of-range" },
      { attacker: "A", target: "B" }
    );
    expect(html).toContain("out-of-range");
  });
});

describe("buildTargetingReportHtml", () => {
  const rows: TargetingRow[] = [
    { index: 0, kind: "beam", status: "will-fire", dice: 3, toHit: null, effect: "3D6" },
    { index: 1, kind: "torpedo", status: "out-of-arc", dice: null, toHit: null, effect: "out of arc" }
  ];

  it("lists each weapon with its effect and names the ships + range", () => {
    const html = buildTargetingReportHtml(rows, { attacker: "RNS Lion", target: "Enemy DD" }, 14);
    expect(html).toContain("RNS Lion");
    expect(html).toContain("Enemy DD");
    expect(html).toContain("14"); // range
    expect(html).toContain("3D6");
    expect(html.toLowerCase()).toContain("out of arc");
  });

  it("notes when no weapon bears", () => {
    const noneBear: TargetingRow[] = [
      { index: 0, kind: "beam", status: "out-of-range", dice: null, toHit: null, effect: "out of range" }
    ];
    const html = buildTargetingReportHtml(noneBear, { attacker: "A", target: "B" }, 99);
    expect(html.toLowerCase()).toContain("no weapon");
  });

  it("escapes ship names (never injects raw HTML)", () => {
    const html = buildTargetingReportHtml(rows, { attacker: "<img src=x onerror=alert(1)>", target: "B" }, 10);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("buildSplitFireReportHtml", () => {
  const report: FireShipSplitReport = {
    fcsCount: 2,
    perTarget: [
      { targetId: "t1", targetName: "Enemy DD", distance: 8, bearing: 0, totalDamage: 4, shots: [], destroyed: false, thresholdsCrossed: [], systemsKnockedOut: 0 },
      { targetId: "t2", targetName: "Enemy CA", distance: 20, bearing: 120, totalDamage: 2, shots: [], destroyed: true, thresholdsCrossed: [1], systemsKnockedOut: 1 }
    ],
    unassigned: [{ index: 3, reason: "fcs-cap" }]
  };

  it("lists each engaged target with its damage + the FCS count", () => {
    const html = buildSplitFireReportHtml(report, "RNS Lion");
    expect(html).toContain("RNS Lion");
    expect(html).toContain("Enemy DD");
    expect(html).toContain("Enemy CA");
    expect(html).toContain("2 FCS");
    expect(html.toLowerCase()).toContain("destroyed");
    expect(html.toLowerCase()).toContain("unassigned");
  });

  it("reports a no-FCS refusal", () => {
    const refused: FireShipSplitReport = { fcsCount: 0, perTarget: [], unassigned: [], refused: "no-fcs" };
    const html = buildSplitFireReportHtml(refused, "A");
    expect(html.toLowerCase()).toContain("fire control");
  });

  it("escapes target names", () => {
    const evil: FireShipSplitReport = {
      fcsCount: 1,
      perTarget: [{ targetId: "x", targetName: "<img src=x>", distance: 5, bearing: 0, totalDamage: 1, shots: [], destroyed: false, thresholdsCrossed: [], systemsKnockedOut: 0 }],
      unassigned: []
    };
    const html = buildSplitFireReportHtml(evil, "A");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("buildMissileReportHtml", () => {
  const base = { attacked: true, warhead: "normal" as const, intercepted: false, totalDamage: 7, destroyed: false, thresholdsCrossed: [] as number[], systemsKnockedOut: 0 };

  it("summarises a warhead strike with damage", () => {
    const html = buildMissileReportHtml(base, "Enemy DD");
    expect(html).toContain("Enemy DD");
    expect(html).toContain("7");
    expect(html.toLowerCase()).toContain("normal");
  });

  it("notes a point-defence interception", () => {
    const html = buildMissileReportHtml({ ...base, intercepted: true }, "T");
    expect(html.toLowerCase()).toContain("point defence");
  });

  it("notes no-strike when the missile did not attack", () => {
    const html = buildMissileReportHtml({ ...base, attacked: false, reason: "out-of-range" }, "T");
    expect(html.toLowerCase()).toContain("no strike");
  });

  it("escapes the target name", () => {
    const html = buildMissileReportHtml(base, "<b>x</b>");
    expect(html).not.toContain("<b>x");
    expect(html).toContain("&lt;b&gt;");
  });
});

describe("buildSpinalReportHtml", () => {
  it("summarises a Wave Gun hit with damage + threshold", () => {
    const html = buildSpinalReportHtml(
      { weapon: "Wave Gun", distance: 10, totalDamage: 14, thresholdsCrossed: [1], systemsKnockedOut: 2, destroyed: false },
      "Enemy CA"
    );
    expect(html).toContain("Wave Gun");
    expect(html).toContain("Enemy CA");
    expect(html).toContain("14");
    expect(html.toLowerCase()).toContain("threshold");
  });

  it("reports out of range", () => {
    const html = buildSpinalReportHtml(
      { weapon: "Wave Gun", outOfRange: true, distance: 99, totalDamage: 0, thresholdsCrossed: [], systemsKnockedOut: 0, destroyed: false },
      "T"
    );
    expect(html.toLowerCase()).toContain("out of range");
  });

  it("escapes the target name and notes destruction", () => {
    const html = buildSpinalReportHtml(
      { weapon: "Nova Cannon", distance: 5, totalDamage: 30, thresholdsCrossed: [], systemsKnockedOut: 0, destroyed: true },
      "<i>x</i>"
    );
    expect(html).not.toContain("<i>x");
    expect(html.toLowerCase()).toContain("destroyed");
  });
});

describe("addSceneControl", () => {
  it("adds a Full Thrust control with fire and plot tools (array payload)", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: any[] = [];
    addSceneControl(controls);

    expect(controls).toHaveLength(1);
    expect(controls[0].name).toBe("battleframe-full-thrust");
    const toolNames = controls[0].tools.map((t: any) => t.name);
    expect(toolNames).toContain("full-thrust-ready");
    expect(toolNames).toContain("full-thrust-initiative");
    expect(toolNames).toContain("full-thrust-phase-status");
    expect(toolNames).toContain("full-thrust-fire");
    expect(toolNames).toContain("full-thrust-targeting");
    expect(toolNames).toContain("full-thrust-split-fire");
    expect(toolNames).toContain("full-thrust-arcs");
    expect(toolNames).toContain("full-thrust-needle");
    expect(toolNames).toContain("full-thrust-salvo");
    expect(toolNames).toContain("full-thrust-launch-missile");
    expect(toolNames).toContain("full-thrust-advance-missiles");
    expect(toolNames).toContain("full-thrust-nova-cannon");
    expect(toolNames).toContain("full-thrust-charge-wave-gun");
    expect(toolNames).toContain("full-thrust-wave-gun");
    expect(toolNames).toContain("full-thrust-fighter-move");
    expect(toolNames).toContain("full-thrust-launch-fighters");
    expect(toolNames).toContain("full-thrust-recover-fighters");
    expect(toolNames).toContain("full-thrust-vector-move");
    expect(toolNames).toContain("full-thrust-new-battle");
    expect(toolNames).toContain("full-thrust-plot");
    expect(toolNames).toContain("full-thrust-execute");
    expect(toolNames).toContain("full-thrust-damage-control");
    expect(toolNames).toContain("full-thrust-new-turn");
    expect(toolNames).toContain("full-thrust-import");
  });

  it("adds the control under the keyed-record payload shape too", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Record<string, any> = {};
    addSceneControl(controls);
    expect(controls["battleframe-full-thrust"]).toBeDefined();
    expect(controls["battleframe-full-thrust"].tools["full-thrust-fire"]).toBeDefined();
    expect(controls["battleframe-full-thrust"].tools["full-thrust-execute"]).toBeDefined();
  });
});

describe("executeManeuversAction (simultaneous reveal of plotted orders)", () => {
  function fakeShipToken(system: Record<string, any>, order: string | undefined) {
    let plotted = order;
    const updates: Record<string, unknown>[] = [];
    const docUpdates: Record<string, unknown>[] = [];
    return {
      actor: {
        type: "battleframe-full-thrust.ship",
        system,
        getFlag: (_m: string, k: string) => (k === "plottedOrder" ? plotted : undefined),
        unsetFlag: (_m: string, _k: string) => {
          plotted = undefined;
          return Promise.resolve();
        },
        update: (data: Record<string, unknown>) => {
          updates.push(data);
          return Promise.resolve();
        },
        get plotted() {
          return plotted;
        }
      },
      updates,
      docUpdates,
      document: {
        x: 0,
        y: 0,
        parent: { grid: { size: 50, distance: 1 } },
        update: (data: Record<string, unknown>) => {
          docUpdates.push(data);
          return Promise.resolve();
        }
      }
    };
  }

  it("applies each ship's plotted order and clears the flag", async () => {
    const ship = fakeShipToken({ velocity: 8, course: 3, thrust: 6 }, "+4,P2");
    const idle = fakeShipToken({ velocity: 0, course: 6, thrust: 4 }, undefined);
    vi.stubGlobal("game", { user: { isGM: true } });
    vi.stubGlobal("canvas", { tokens: { placeables: [ship, idle] } });

    await executeManeuversAction();

    // Plotted ship: velocity 8+4=12, course 3 port 2 -> 1; flag cleared; token moved.
    expect(ship.updates).toContainEqual({ "system.velocity": 12, "system.course": 1 });
    expect(ship.actor.plotted).toBeUndefined();
    expect(ship.docUpdates.length).toBeGreaterThan(0);
    // Ship with no plotted order is untouched.
    expect(idle.updates).toHaveLength(0);
  });

  it("refuses when the caller is not the GM", async () => {
    const warn = vi.fn();
    vi.stubGlobal("game", { user: { isGM: false } });
    vi.stubGlobal("ui", { notifications: { warn } });
    await executeManeuversAction();
    expect(warn).toHaveBeenCalled();
  });
});

describe("beginFirePhaseAction (roll initiative, persist the fire phase)", () => {
  function shipTok(id: string, disposition: number) {
    return { id, actor: { type: "battleframe-full-thrust.ship" }, document: { disposition } };
  }

  it("rolls initiative and stores the phase on the scene, winner first", async () => {
    const flags: Record<string, any> = {};
    const scene = {
      grid: { size: 50, distance: 1 },
      getFlag: (_m: string, k: string) => flags[k],
      setFlag: (_m: string, k: string, v: unknown) => {
        flags[k] = v;
        return Promise.resolve();
      },
      unsetFlag: (_m: string, k: string) => {
        delete flags[k];
        return Promise.resolve();
      }
    };
    // Side "1" rolls 5, side "-1" rolls 3 -> side "1" wins.
    const pools = [[5], [3]];
    const rollPool = vi.fn(async () => pools.shift() ?? []);
    // Fake engine rounds API: returns an order that serializes to engine state.
    const rounds = {
      createActivationOrder: (p: any) => ({
        serialize: () => ({ firstSideId: p.firstSideId, activatedIds: [], priorityPointer: 0, mainPointer: 0 }),
        isComplete: () => false,
        activeSideId: () => p.firstSideId,
        eligible: () => ["a1"]
      }),
      restoreActivationOrder: vi.fn()
    };
    vi.stubGlobal("game", {
      user: { isGM: true },
      battleframe: { dice: { rollPool }, rounds },
      combats: { active: undefined }
    });
    vi.stubGlobal("canvas", {
      tokens: { placeables: [shipTok("a1", 1), shipTok("b1", -1)] },
      scene
    });
    vi.stubGlobal("ui", { notifications: { info: vi.fn(), warn: vi.fn() } });

    await beginFirePhaseAction();

    expect(flags.firePhase).toBeDefined();
    expect(flags.firePhase.firstSideId).toBe("1"); // side 1 won initiative
    expect(flags.firePhase.activatedIds).toEqual([]);
  });

  it("warns and does nothing when ships are not on two sides", async () => {
    const warn = vi.fn();
    vi.stubGlobal("game", {
      user: { isGM: true },
      battleframe: { dice: { rollPool: vi.fn() }, rounds: { createActivationOrder: vi.fn(), restoreActivationOrder: vi.fn() } },
      combats: {}
    });
    vi.stubGlobal("canvas", { tokens: { placeables: [shipTok("a1", 1), shipTok("a2", 1)] }, scene: {} });
    vi.stubGlobal("ui", { notifications: { warn, info: vi.fn() } });

    await beginFirePhaseAction();
    expect(warn).toHaveBeenCalled();
  });
});

describe("newTurnAction", () => {
  it("clears plotted orders and the fire phase", async () => {
    const shipFlags: Record<string, any> = { plottedOrder: "+4" };
    const sceneFlags: Record<string, any> = { firePhase: { firstSideId: "1" } };
    const ship = {
      actor: {
        type: "battleframe-full-thrust.ship",
        getFlag: (_m: string, k: string) => shipFlags[k],
        unsetFlag: (_m: string, k: string) => {
          delete shipFlags[k];
          return Promise.resolve();
        }
      }
    };
    const scene = {
      unsetFlag: (_m: string, k: string) => {
        delete sceneFlags[k];
        return Promise.resolve();
      }
    };
    vi.stubGlobal("game", { user: { isGM: true }, combats: { active: undefined } });
    vi.stubGlobal("canvas", { tokens: { placeables: [ship] }, scene });
    vi.stubGlobal("ui", { notifications: { info: vi.fn(), warn: vi.fn() } });

    await newTurnAction();

    expect(shipFlags.plottedOrder).toBeUndefined();
    expect(sceneFlags.firePhase).toBeUndefined();
  });
});

describe("registerRoundControl", () => {
  it("answers Foundry's getSceneControlButtons hook", () => {
    const on = vi.fn();
    vi.stubGlobal("Hooks", { on });
    registerRoundControl();
    expect(on).toHaveBeenCalledWith("getSceneControlButtons", expect.any(Function));
  });

  it("does nothing when Hooks is absent", () => {
    vi.stubGlobal("Hooks", undefined);
    expect(() => registerRoundControl()).not.toThrow();
  });
});

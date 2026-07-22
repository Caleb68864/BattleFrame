import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFireReportHtml,
  buildFighterReportHtml,
  addSceneControl,
  registerRoundControl,
  executeManeuversAction,
  beginFirePhaseAction
} from "../src/ui/round-control";
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
    systemsKnockedOut: 0
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

describe("addSceneControl", () => {
  it("adds a Full Thrust control with fire and plot tools (array payload)", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: any[] = [];
    addSceneControl(controls);

    expect(controls).toHaveLength(1);
    expect(controls[0].name).toBe("battleframe-full-thrust");
    const toolNames = controls[0].tools.map((t: any) => t.name);
    expect(toolNames).toContain("full-thrust-initiative");
    expect(toolNames).toContain("full-thrust-fire");
    expect(toolNames).toContain("full-thrust-plot");
    expect(toolNames).toContain("full-thrust-execute");
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
    vi.stubGlobal("game", {
      user: { isGM: true },
      battleframe: { dice: { rollPool } },
      combats: { active: undefined }
    });
    vi.stubGlobal("canvas", {
      tokens: { placeables: [shipTok("a1", 1), shipTok("b1", -1)] },
      scene
    });
    vi.stubGlobal("ui", { notifications: { info: vi.fn(), warn: vi.fn() } });

    await beginFirePhaseAction();

    expect(flags.firePhase).toBeDefined();
    expect(flags.firePhase.firstSideId).toBe("1");
    expect(flags.firePhase.activeSideId).toBe("1");
    expect(flags.firePhase.fired).toEqual([]);
  });

  it("warns and does nothing when ships are not on two sides", async () => {
    const warn = vi.fn();
    vi.stubGlobal("game", { user: { isGM: true }, battleframe: { dice: { rollPool: vi.fn() } }, combats: {} });
    vi.stubGlobal("canvas", { tokens: { placeables: [shipTok("a1", 1), shipTok("a2", 1)] }, scene: {} });
    vi.stubGlobal("ui", { notifications: { warn, info: vi.fn() } });

    await beginFirePhaseAction();
    expect(warn).toHaveBeenCalled();
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

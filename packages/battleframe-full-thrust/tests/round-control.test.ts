import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFireReportHtml,
  buildFighterReportHtml,
  addSceneControl,
  registerRoundControl
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
    expect(toolNames).toContain("full-thrust-fire");
    expect(toolNames).toContain("full-thrust-plot");
  });

  it("adds the control under the keyed-record payload shape too", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Record<string, any> = {};
    addSceneControl(controls);
    expect(controls["battleframe-full-thrust"]).toBeDefined();
    expect(controls["battleframe-full-thrust"].tools["full-thrust-fire"]).toBeDefined();
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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fireReportParts,
  buildFireReportHtml,
  resolveFireAction,
  addSceneControl,
  runRoundControl,
  fireSelectedControl,
  FIRE_REPORT_CLASS,
  type FireActorLike
} from "../src/ui/round-control";
import type { DispersedFireOutcome } from "../src/combat/fire";
import type { DiceApiLike } from "../src/combat/fire";

afterEach(() => {
  delete (globalThis as any).game;
  delete (globalThis as any).canvas;
  delete (globalThis as any).ui;
  delete (globalThis as any).Hooks;
});

/** A dice mock returning queued totals from `roll`, in order. */
function scriptedDice(totals: number[]): DiceApiLike {
  let i = 0;
  return {
    async roll() {
      return { total: totals[Math.min(i++, totals.length - 1)] };
    },
    async rollPool(count) {
      return Array.from({ length: count }, () => totals[Math.min(i++, totals.length - 1)]);
    }
  };
}

function outcomeFixture(over: Partial<DispersedFireOutcome> = {}): DispersedFireOutcome {
  return {
    firerFaces: [10, 9],
    rangeFace: 2,
    beats: 2,
    tier: "effective",
    sum: 19,
    potentialHits: 4,
    remainder: 3,
    extraHit: true,
    hits: 5,
    impacts: [
      { impact: 5, armour: 1, result: "kill" },
      { impact: 3, armour: 2, result: "wound" }
    ],
    figures: [],
    wiped: true,
    suppressionApplied: true,
    ...over
  };
}

/* ---- Fire card (pure) -------------------------------------------------- */

describe("fireReportParts", () => {
  it("titles the card attacker -> target and escapes names", () => {
    const { title } = fireReportParts(outcomeFixture(), { attacker: "A<b>", target: "T" }, {
      rangeDie: "d4",
      coverShift: 0
    });
    expect(title).toContain("&lt;b&gt;");
    expect(title).toContain("&rarr;");
  });

  it("shows beats, tier, the hit breakdown, and a wipe/suppression note on effective fire", () => {
    const { lines } = fireReportParts(outcomeFixture(), { attacker: "A", target: "T" }, {
      rangeDie: "d4",
      coverShift: 1
    });
    const html = lines.join("");
    expect(html).toContain("2</strong> beat");
    expect(html).toContain("Effective");
    expect(html).toContain("cover +1");
    expect(html).toContain("wiped out");
    expect(html).toContain("suppression marker");
  });

  it("stops at the tier line for a miss", () => {
    const { lines } = fireReportParts(
      outcomeFixture({ tier: "miss", beats: 0, hits: 0, wiped: false, suppressionApplied: false, impacts: [] }),
      { attacker: "A", target: "T" },
      { rangeDie: "d8", coverShift: 0 }
    );
    const html = lines.join("");
    expect(html).toContain("Miss");
    expect(html).not.toContain("hit(s).");
  });
});

describe("buildFireReportHtml", () => {
  it("wraps the report in the battleframe-card with the SG2 accent class", () => {
    const html = buildFireReportHtml(outcomeFixture(), { attacker: "A", target: "T" }, {
      rangeDie: "d4",
      coverShift: 0
    });
    expect(html).toContain("battleframe-card");
    expect(html).toContain(FIRE_REPORT_CLASS);
  });
});

/* ---- Fire action orchestration (injected deps) ------------------------- */

function attackerActor(): FireActorLike {
  return {
    name: "Alpha",
    system: {
      quality: "d12",
      figures: [
        { name: "1", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
        { name: "2", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
        { name: "3", armour: "d4", weaponId: "", wounds: 0, status: "ok" }
      ],
      weapons: [{ id: "rifle", firepower: 2, impact: "d8" }]
    }
  };
}

function targetActor(): FireActorLike {
  return {
    name: "Bravo",
    system: {
      quality: "d8",
      inPosition: false,
      suppression: 0,
      figures: [
        { name: "a", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
        { name: "b", armour: "d4", weaponId: "", wounds: 0, status: "ok" },
        { name: "c", armour: "d4", weaponId: "", wounds: 0, status: "ok" }
      ],
      weapons: []
    },
    update: vi.fn(async () => undefined)
  };
}

describe("resolveFireAction", () => {
  it("resolves effective fire, applies casualties + suppression, and posts a card", async () => {
    // firer [12->10, FP d6->9] vs range d4 face 2 = 2 beats effective. sum 19 / 4 =
    // 4 hits, remainder 3, extra reroll 2 (<=3) -> 5 hits, all kills -> wiped.
    const dice = scriptedDice([10, 9, 2, 2, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1]);
    const applyState = vi.fn(async () => undefined);
    const postCard = vi.fn(async () => undefined);

    const result = await resolveFireAction({
      attacker: attackerActor(),
      target: targetActor(),
      distanceInches: 2,
      coverShift: 0,
      losClear: true,
      dice,
      rng: () => 0,
      applyState,
      postCard
    });

    expect(result.outcome?.tier).toBe("effective");
    expect(result.rangeDie).toBe("d4");
    expect(applyState).toHaveBeenCalledTimes(1);
    expect(postCard).toHaveBeenCalledWith(expect.objectContaining({ cssClass: FIRE_REPORT_CLASS }));
    // suppression laid -> the applied suppression is 1 (placeSuppression from 0).
    expect(applyState.mock.calls[0][2]).toBe(1);
  });

  it("refuses with no line of fire and posts nothing", async () => {
    const postCard = vi.fn(async () => undefined);
    const result = await resolveFireAction({
      attacker: attackerActor(),
      target: targetActor(),
      distanceInches: 2,
      coverShift: 0,
      losClear: false,
      dice: scriptedDice([1]),
      rng: () => 0,
      postCard
    });
    expect(result.reason).toBe("no-lof");
    expect(postCard).not.toHaveBeenCalled();
  });

  it("reports out of range when the target is beyond five bands", async () => {
    const attacker = attackerActor();
    attacker.system.quality = "d4"; // 4in bands
    const result = await resolveFireAction({
      attacker,
      target: targetActor(),
      distanceInches: 100, // 25 bands
      coverShift: 0,
      losClear: true,
      dice: scriptedDice([1]),
      rng: () => 0
    });
    expect(result.reason).toBe("out-of-range");
  });
});

/* ---- Scene control structure + reachability guard ---------------------- */

describe("addSceneControl", () => {
  it("registers the SG2 control with ready/run/activate/fire tools (array shape)", () => {
    (globalThis as any).game = { user: { isGM: true } };
    const controls: any[] = [];
    addSceneControl(controls);
    expect(controls).toHaveLength(1);
    const toolNames = controls[0].tools.map((t: any) => t.name);
    expect(toolNames).toEqual([
      "stargrunt-ii-ready",
      "stargrunt-ii-run-turn",
      "stargrunt-ii-activate",
      "stargrunt-ii-fire"
    ]);
  });

  it("registers the control in the record/object payload shape too", () => {
    (globalThis as any).game = { user: { isGM: true } };
    const controls: Record<string, any> = {};
    addSceneControl(controls);
    expect(controls["battleframe-stargrunt-ii"].tools["stargrunt-ii-fire"]).toBeDefined();
  });
});

/** A canvas token double for a SG2 unit. */
function unitToken(id: string, disposition: number, over: Partial<FireActorLike["system"]> = {}) {
  return {
    id,
    center: { x: 0, y: 0 },
    document: { id, disposition },
    actor: {
      id,
      type: "battleframe-stargrunt-ii.unit",
      name: id,
      update: vi.fn(async () => undefined),
      toggleStatusEffect: vi.fn(async () => undefined),
      system: {
        quality: "d10",
        inPosition: false,
        suppression: 0,
        figures: [{ name: "x", armour: "d4", weaponId: "", wounds: 0, status: "ok" }],
        weapons: [{ id: "rifle", firepower: 2, impact: "d8" }],
        ...over
      }
    }
  };
}

describe("scene-control reachability — the control entry points reach the pure functions", () => {
  it("wires every tool's click handler to a control function", () => {
    (globalThis as any).game = { user: { isGM: true } };
    const controls: any[] = [];
    addSceneControl(controls);
    for (const tool of controls[0].tools) {
      expect(typeof tool.onClick === "function" || typeof tool.onChange === "function").toBe(true);
    }
  });

  it("runRoundControl (the run tool's handler) starts a turn: the session serializes onto the Combat flag", async () => {
    const setFlag = vi.fn(async () => undefined);
    const combat = { getFlag: () => undefined, setFlag, startCombat: async () => undefined };
    (globalThis as any).game = {
      user: { isGM: true },
      combat,
      battleframe: { dice: scriptedDice([3, 7]) } // tie roll-off d10s
    };
    (globalThis as any).canvas = {
      tokens: { placeables: [unitToken("A", 1), unitToken("B", -1)] }
    };

    await runRoundControl();

    expect(setFlag).toHaveBeenCalled();
    const [, key, state] = setFlag.mock.calls[setFlag.mock.calls.length - 1];
    expect(key).toBe("round");
    expect(state.turn).toBe(1);
    expect(["friendly", "hostile"]).toContain(state.firstSideId);
  });

  it("a rejecting wrapped handler is caught and surfaced, never leaked as an unhandled rejection", async () => {
    const error = vi.fn();
    (globalThis as any).ui = { notifications: { info: vi.fn(), warn: vi.fn(), error } };
    // The ready tool's onChange runs readyAction, whose only async action is
    // advance.toggleReady(). Make that reject: the guard must catch it.
    (globalThis as any).game = {
      user: { isGM: true },
      battleframe: {
        advance: {
          toggleReady: async () => {
            throw new Error("boom");
          }
        }
      }
    };

    const controls: any[] = [];
    addSceneControl(controls);
    const readyTool = controls[0].tools.find((t: any) => t.name === "stargrunt-ii-ready");

    // Invoking the handler must NOT throw synchronously and must NOT reject.
    expect(() => readyTool.onChange()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    // The rejection was routed through the module's notify path, not leaked.
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toContain("battleframe-stargrunt-ii");
  });

  it("fireSelectedControl (the fire tool's handler) reaches resolveDispersedFire and posts an outcome card", async () => {
    const postCard = vi.fn(async () => undefined);
    const attacker = unitToken("A", 1);
    const target = unitToken("B", -1);
    (globalThis as any).game = {
      user: { isGM: true },
      battleframe: {
        dice: scriptedDice([9, 6, 2, 2, 5, 1, 5, 1, 5, 1]),
        chat: { postCard },
        selection: {
          controlledOne: () => attacker,
          firstTarget: () => target
        }
      }
    };
    (globalThis as any).canvas = { tokens: { placeables: [attacker, target] } };

    await fireSelectedControl();

    expect(postCard).toHaveBeenCalledWith(expect.objectContaining({ cssClass: FIRE_REPORT_CLASS }));
  });
});

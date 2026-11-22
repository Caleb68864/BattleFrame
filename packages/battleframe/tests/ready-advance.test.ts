/**
 * Player-driven round advancement (GM-less play): every participant marks "ready
 * to advance"; when all are ready a settable countdown runs; at its end the round
 * advances (a ruleset-registered callback) and ready flags clear. Un-readying
 * cancels the countdown. This covers the pure decisions — who participates, are
 * all ready, which client performs the advance, and the ready-map transition.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  participantsOf,
  allReady,
  advancingHost,
  toggledReady,
  gmConnected,
  advanceStrategy,
  createReadyAdvanceApi,
  registerReadyAdvance
} from "../src/rounds/ready-advance";

afterEach(() => vi.unstubAllGlobals());

describe("participantsOf", () => {
  const users = [
    { id: "gm", active: true, isGM: true },
    { id: "p1", active: true, isGM: false },
    { id: "p2", active: false, isGM: false },
    { id: "p3", active: true, isGM: false }
  ];

  it("is the active non-GM users", () => {
    expect(participantsOf(users).sort()).toEqual(["p1", "p3"]);
  });

  it("falls back to active users when no non-GM player is present (GM solo)", () => {
    expect(participantsOf([{ id: "gm", active: true, isGM: true }])).toEqual(["gm"]);
  });
});

describe("allReady", () => {
  it("is true only when every participant is ready", () => {
    expect(allReady(["p1", "p3"], ["p1", "p3"])).toBe(true);
    expect(allReady(["p1"], ["p1", "p3"])).toBe(false);
    expect(allReady([], ["p1"])).toBe(false);
  });

  it("is false when there are no participants (nothing to advance)", () => {
    expect(allReady([], [])).toBe(false);
  });

  it("ignores ready flags from non-participants", () => {
    expect(allReady(["p1", "p3", "ghost"], ["p1", "p3"])).toBe(true);
  });
});

describe("advancingHost", () => {
  it("is the lexicographically-smallest participant id (deterministic across clients)", () => {
    expect(advancingHost(["p3", "p1", "p2"])).toBe("p1");
  });

  it("is undefined when there are no participants", () => {
    expect(advancingHost([])).toBeUndefined();
  });
});

describe("toggledReady", () => {
  it("adds a user's ready flag when absent", () => {
    expect(toggledReady({}, "p1")).toEqual({ p1: true });
  });

  it("removes it when present (un-ready)", () => {
    expect(toggledReady({ p1: true, p2: true }, "p1")).toEqual({ p2: true });
  });
});

describe("gmConnected", () => {
  it("is true when an active GM (assistant or full) is present", () => {
    const users = [
      { id: "gm", active: true, isGM: true },
      { id: "p1", active: true, isGM: false }
    ];
    expect(gmConnected(users)).toBe(true);
  });

  it("is false when the only GM is disconnected", () => {
    const users = [
      { id: "gm", active: false, isGM: true },
      { id: "p1", active: true, isGM: false }
    ];
    expect(gmConnected(users)).toBe(false);
  });

  it("is false at an all-player table (no GM to receive a delegated advance)", () => {
    expect(gmConnected([{ id: "p1", active: true, isGM: false }])).toBe(false);
  });
});

describe("toggleReady — resilient to a forbidden flag write", () => {
  it("resolves instead of rejecting when the player may not write the GM-owned doc", async () => {
    // The flagship GM-less case: a plain PLAYER toggles ready, but writing the
    // ready flag on a GM-owned Combat/Scene is forbidden (no socketlib/Assistant-GM),
    // so setFlag rejects. toggleReady must swallow it and surface a notice, never
    // reject an unhandled promise out of the scene-control click handler.
    const doc = {
      getFlag: () => ({}),
      setFlag: () => Promise.reject(new Error("User lacks permission to update Combat")),
      update: () => Promise.reject(new Error("User lacks permission to update Combat"))
    };
    const warn = vi.fn();
    vi.stubGlobal("game", { user: { id: "p1" }, combats: { active: doc } });
    vi.stubGlobal("ui", { notifications: { warn } });
    const api = createReadyAdvanceApi();
    await expect(api.toggleReady()).resolves.toBeUndefined();
  });
});

describe("advanceStrategy", () => {
  it("delegates the privileged write to a GM when socketlib is ready and a GM is connected", () => {
    expect(advanceStrategy({ socketlibReady: true, gmConnected: true })).toBe("delegate");
  });

  it("runs locally when socketlib is unavailable (the pre-socketlib Assistant-GM path)", () => {
    expect(advanceStrategy({ socketlibReady: false, gmConnected: true })).toBe("local");
  });

  it("runs locally when no GM is connected to receive the delegation", () => {
    expect(advanceStrategy({ socketlibReady: true, gmConnected: false })).toBe("local");
  });
});

describe("socketlib carries a plain player's ready toggle to the GM", () => {
  // GM-less play with socketlib: the docs promise plain players drive it as long as
  // a GM is online. The advance was delegated, but the ready toggle itself was
  // always written directly to the GM-owned Combat/Scene, which a plain player may
  // not write; and the manifest lacked `"socket": true`, without which socketlib
  // refuses to register the system at all.
  function socketWorld(isOwner: boolean) {
    const handlers: Record<string, (...args: any[]) => unknown> = {};
    const executeAsGM = vi.fn(async (name: string, ...args: any[]) =>
      handlers[name].call({ socketdata: { userId: "p1" } }, ...args)
    );
    const reg = { register: (name: string, fn: (...args: any[]) => unknown) => (handlers[name] = fn), executeAsGM };
    let once: (() => void) | undefined;
    const flags: Record<string, boolean> = {};
    const doc = {
      isOwner,
      getFlag: () => ({ ...flags }),
      setFlag: vi.fn(async (_s: string, _k: string, value: Record<string, boolean>) => Object.assign(flags, value)),
      update: vi.fn(async (data: Record<string, unknown>) => {
        for (const key of Object.keys(data)) delete flags[key.split(".-=")[1]];
      }),
      unsetFlag: vi.fn()
    };
    vi.stubGlobal("game", {
      user: { id: "p1" },
      users: [
        { id: "gm", active: true, isGM: true },
        { id: "p1", active: true, isGM: false }
      ],
      combats: { active: doc },
      settings: { register: vi.fn(), get: () => 5 }
    });
    vi.stubGlobal("Hooks", { on: vi.fn(), once: (_e: string, cb: () => void) => (once = cb) });
    vi.stubGlobal("socketlib", { registerSystem: () => reg });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn(), info: vi.fn() } });
    registerReadyAdvance();
    once?.();
    return { doc, executeAsGM, flags };
  }

  it("a player who cannot write the document asks the GM to write it", async () => {
    const { doc, executeAsGM, flags } = socketWorld(false);
    const api = createReadyAdvanceApi();

    await api.toggleReady();
    expect(executeAsGM).toHaveBeenCalledWith("setReady", true);
    expect(flags).toEqual({ p1: true });

    await api.toggleReady();
    expect(executeAsGM).toHaveBeenLastCalledWith("setReady", false);
    expect(flags).toEqual({});
    expect(doc.setFlag).toHaveBeenCalledTimes(1); // only the GM-side write
  });

  it("an owner writes directly, as before", async () => {
    const { executeAsGM, flags } = socketWorld(true);

    await createReadyAdvanceApi().toggleReady();

    expect(executeAsGM).not.toHaveBeenCalled();
    expect(flags).toEqual({ p1: true });
  });

  it("the system manifest declares a socket, which socketlib requires", () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, "../system.json"), "utf8"));
    expect(manifest.socket).toBe(true);
  });
});

describe("a delegated advance runs on a GM viewing the players' scene", () => {
  // The advance was handed to any GM (`executeAsGM`). The ruleset's callback reads
  // the canvas, so a GM looking at another scene advanced that scene, or found no
  // units. And its toasts appeared only on that GM's screen.
  function world(opts: { gmScene: string; hostScene?: string; outcome?: unknown; hostIsGM?: boolean }) {
    const handlers: Record<string, (...args: any[]) => unknown> = {};
    const executeAsUser = vi.fn(async (name: string, _userId: string, ...args: any[]) => handlers[name](...args));
    const executeAsGM = vi.fn(async (name: string, ...args: any[]) => handlers[name](...args));
    const executeForEveryone = vi.fn(async (name: string, ...args: any[]) => handlers[name](...args));
    const reg = {
      register: (name: string, fn: (...args: any[]) => unknown) => (handlers[name] = fn),
      executeAsUser,
      executeAsGM,
      executeForEveryone
    };
    let once: (() => void) | undefined;
    const hooks: Record<string, () => void> = {};
    const info = vi.fn();
    const warn = vi.fn();
    const doc = { getFlag: () => ({ p1: true }), unsetFlag: vi.fn(async () => undefined), setFlag: vi.fn(), update: vi.fn() };
    vi.stubGlobal("game", {
      user: { id: "p1", isGM: opts.hostIsGM ?? false },
      users: [
        { id: "gm", active: true, isGM: true, viewedScene: opts.gmScene },
        { id: "p1", active: true, isGM: false, viewedScene: opts.hostScene ?? "s1" }
      ],
      combats: { active: doc },
      settings: { register: vi.fn(), get: () => 0 }
    });
    vi.stubGlobal("canvas", { scene: { id: opts.hostScene ?? "s1" } });
    vi.stubGlobal("Hooks", { on: (e: string, cb: () => void) => (hooks[e] = cb), once: (_e: string, cb: () => void) => (once = cb) });
    vi.stubGlobal("socketlib", { registerSystem: () => reg });
    vi.stubGlobal("ui", { notifications: { info, warn, error: vi.fn() } });
    const api = createReadyAdvanceApi();
    const advance = vi.fn(async () => opts.outcome);
    api.registerAdvance(advance as never);
    registerReadyAdvance();
    once?.();
    return { hooks, advance, executeAsUser, executeAsGM, executeForEveryone, info, warn };
  }

  async function runCountdown(hooks: Record<string, () => void>) {
    vi.useFakeTimers();
    hooks.updateCombat();
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  }

  it("delegates to the GM on the same scene", async () => {
    const w = world({ gmScene: "s1" });
    await runCountdown(w.hooks);
    expect(w.executeAsUser).toHaveBeenCalledWith("performAdvance", "gm");
    expect(w.advance).toHaveBeenCalledTimes(1);
  });

  it("does not advance through a GM looking at another scene, and says why", async () => {
    const w = world({ gmScene: "elsewhere" });
    await runCountdown(w.hooks);
    expect(w.advance).not.toHaveBeenCalled();
    expect(w.executeAsGM).not.toHaveBeenCalled();
    expect(w.warn).toHaveBeenCalledTimes(1);
  });

  it("shows the advance's outcome to everyone, not just the GM", async () => {
    const w = world({ gmScene: "s1", outcome: { message: "New round", level: "info" } });
    await runCountdown(w.hooks);
    expect(w.executeForEveryone).toHaveBeenCalledWith("notify", "New round", "info");
    expect(w.info).toHaveBeenCalledWith("New round");
  });
});

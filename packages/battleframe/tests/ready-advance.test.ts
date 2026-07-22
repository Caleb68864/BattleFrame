/**
 * Player-driven round advancement (GM-less play): every participant marks "ready
 * to advance"; when all are ready a settable countdown runs; at its end the round
 * advances (a ruleset-registered callback) and ready flags clear. Un-readying
 * cancels the countdown. This covers the pure decisions — who participates, are
 * all ready, which client performs the advance, and the ready-map transition.
 */

import { describe, expect, it } from "vitest";
import {
  participantsOf,
  allReady,
  advancingHost,
  toggledReady,
  gmConnected,
  advanceStrategy
} from "../src/rounds/ready-advance";

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

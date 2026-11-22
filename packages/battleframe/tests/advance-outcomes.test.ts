import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceTurnCore as dirtsideAdvance } from "../../battleframe-dirtside-ii/src/ui/round-control";
import { advanceTurnCore as stargruntAdvance } from "../../battleframe-stargrunt-ii/src/ui/round-control";
import { advancePhaseCore as fullThrustAdvance } from "../../battleframe-full-thrust/src/ui/round-control";
import { advanceRoundForReady as greathelmAdvance } from "../../battleframe-greathelm/src/ui/round-control";

/**
 * A ready-driven advance can run on a GM's client (delegated over socketlib), so
 * a toast it raises reaches only that GM. The engine shows a returned
 * `{ message, level }` to every player instead (2026-11-21). Simple Skirmish and
 * InCountry did this first; these are the other four rulesets. Each advance now
 * returns its outcome and does not toast it itself.
 */

afterEach(() => vi.unstubAllGlobals());

function quietWorld(extra: Record<string, unknown> = {}) {
  const notifications = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  vi.stubGlobal("ui", { notifications });
  vi.stubGlobal("game", {
    i18n: { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` },
    settings: { get: () => undefined },
    actors: { contents: [] },
    user: { isGM: true },
    ...extra
  });
  vi.stubGlobal("canvas", {
    scene: { id: "s", getFlag: () => undefined, setFlag: vi.fn(), unsetFlag: vi.fn() },
    tokens: { placeables: [], controlled: [] }
  });
  return notifications;
}

const toasted = (n: ReturnType<typeof quietWorld>) => n.info.mock.calls.length + n.warn.mock.calls.length + n.error.mock.calls.length;

describe("each ruleset's ready-driven advance reports its outcome", () => {
  it("Dirtside II", async () => {
    const n = quietWorld();
    const outcome = await dirtsideAdvance();
    expect(outcome).toEqual({ message: "[battleframe-dirtside-ii.controls.round.noUnits]", level: "warn" });
    expect(toasted(n)).toBe(0);
  });

  it("Stargrunt II", async () => {
    const n = quietWorld();
    const outcome = await stargruntAdvance();
    expect(outcome?.level).toBe("error");
    expect(outcome?.message).toContain("battleframe-stargrunt-ii.controls.round.");
    expect(toasted(n)).toBe(0);
  });

  it("Full Thrust: the phase it moved to", async () => {
    quietWorld();
    // A fire phase is running, so this advance ends the turn.
    const scene = { id: "s", getFlag: (_s: string, k: string) => (k === "firePhase" ? { order: {} } : undefined), setFlag: vi.fn(), unsetFlag: vi.fn() };
    vi.stubGlobal("canvas", { scene, tokens: { placeables: [], controlled: [] } });
    const outcome = await fullThrustAdvance();
    expect(outcome).toEqual({ message: "[battleframe-full-thrust.notify.phaseNewTurn]", level: "info" });
  });

  it("GREATHELM: a refused advance", async () => {
    const n = quietWorld();
    const outcome = await greathelmAdvance();
    expect(outcome?.level).toBe("error");
    expect(outcome?.message).toContain("battleframe-greathelm.controls.round.noApi");
    expect(toasted(n)).toBe(0);
  });
});

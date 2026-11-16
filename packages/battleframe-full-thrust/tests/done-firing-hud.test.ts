import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doneFiringAction, mayShowDoneFiring } from "../src/ui/round-control";
import {
  DONE_FIRING_HUD_BUTTON,
  registerTokenHudActions,
  tokenHudButtonModels
} from "../src/ui/token-hud-actions";
import langEn from "../lang/en.json";
import { withRules } from "./helpers/world";

// Done firing on the ship token's HUD: GM only, shown only in the fire phase for
// one of the active side's unfired ships, and it runs the scene tool's handler.

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

const SHIP_TYPE = "battleframe-full-thrust.ship";

function ship(id: string, disposition: number) {
  return {
    id,
    name: id,
    document: { disposition },
    control: vi.fn(),
    actor: {
      type: SHIP_TYPE,
      system: { thrust: 4, driveHits: 0, fcs: 1, fcsLost: 0, bays: 0, weapons: [{ kind: "beam", destroyed: false, spent: false }], hull: 4, hullDamage: 0 },
      update: vi.fn()
    }
  };
}

function world(opts: { firePhase?: unknown; activeSide?: string; eligible?: string[]; gm?: boolean; rounds?: boolean }) {
  const warn = vi.fn();
  const attacker = ship("a1", 1);
  const other = ship("b1", -1);
  const order = {
    activeSideId: () => opts.activeSide,
    isComplete: () => false,
    eligible: () => opts.eligible ?? [],
    activate: vi.fn(),
    serialize: () => ({ saved: true }),
    toState: () => ({}),
    initiativeOrder: () => [],
    sides: () => []
  };
  vi.stubGlobal("game", {
    ...(globalThis as any).game,
    user: { isGM: opts.gm ?? true, targets: { first: () => undefined } },
    battleframe: {
      ...(opts.rounds === false
        ? {}
        : { rounds: { createActivationOrder: vi.fn(() => order), restoreActivationOrder: vi.fn(() => order) } })
    },
    combats: { active: undefined }
  });
  vi.stubGlobal("canvas", {
    tokens: { controlled: [attacker], placeables: [attacker, other] },
    scene: { getFlag: () => opts.firePhase, setFlag: vi.fn(), unsetFlag: vi.fn() }
  });
  vi.stubGlobal("ChatMessage", { create: vi.fn(async () => undefined), getSpeaker: () => ({}) });
  vi.stubGlobal("ui", { notifications: { warn, error: vi.fn(), info: vi.fn() } });
  vi.stubGlobal("foundry", undefined);
  return { warn, order, attacker, other };
}

const LIVE = { firePhase: { anything: true }, activeSide: "1", eligible: ["a1"] };

describe("mayShowDoneFiring (HUD visibility)", () => {
  it("is true for the GM on the active side's unfired ship in the fire phase", () => {
    const w = world(LIVE);
    expect(mayShowDoneFiring(w.attacker)).toBe(true);
  });

  it("is false for a non-GM", () => {
    const w = world({ ...LIVE, gm: false });
    expect(mayShowDoneFiring(w.attacker)).toBe(false);
  });

  it("is false outside the fire phase", () => {
    const w = world({ ...LIVE, firePhase: undefined });
    expect(mayShowDoneFiring(w.attacker)).toBe(false);
  });

  it("is false for a ship on the side that is not active", () => {
    const w = world(LIVE);
    expect(mayShowDoneFiring(w.other)).toBe(false);
  });

  it("is false for a ship that has already fired", () => {
    const w = world({ ...LIVE, eligible: [] });
    expect(mayShowDoneFiring(w.attacker)).toBe(false);
  });

  it("is false when no fire order can be restored", () => {
    const w = world({ ...LIVE, rounds: false });
    expect(mayShowDoneFiring(w.attacker)).toBe(false);
  });

  it("never toasts (a HUD render must stay silent)", () => {
    for (const opts of [{ gm: false }, { firePhase: undefined }, { eligible: [] as string[] }, { rounds: false }]) {
      const w = world({ ...LIVE, ...opts });
      mayShowDoneFiring(w.attacker);
      expect(w.warn).not.toHaveBeenCalled();
    }
  });
});

describe("tokenHudButtonModels", () => {
  it("adds Done firing right after Fire when allowed", () => {
    const keys = tokenHudButtonModels(ship("a1", 1), "fire", () => true).map((m) => m.key);
    expect(keys.indexOf("doneFiring")).toBe(keys.indexOf("fire") + 1);
  });

  it("adds Done firing before Hold for a ship with no Fire button", () => {
    const s = ship("a1", 1);
    s.actor.system.weapons = [];
    const keys = tokenHudButtonModels(s, "fire", () => true).map((m) => m.key);
    expect(keys).toEqual(["doneFiring", "hold"]);
  });

  it("omits Done firing when not allowed", () => {
    const keys = tokenHudButtonModels(ship("a1", 1), "fire", () => false).map((m) => m.key);
    expect(keys).not.toContain("doneFiring");
  });

  it("never offers it on a non-ship token", () => {
    expect(tokenHudButtonModels({ actor: { type: "character" } }, "fire", () => true)).toEqual([]);
  });

  it("uses the scene tool's handler and a localized string", () => {
    expect(DONE_FIRING_HUD_BUTTON.action).toBe(doneFiringAction);
    expect((langEn as Record<string, string>)[DONE_FIRING_HUD_BUTTON.tooltipKey]).toBeTypeOf("string");
  });
});

/** A fake HUD root that records injected buttons. */
function fakeHud(): { root: any; buttons: any[] } {
  const buttons: any[] = [];
  const col = { appendChild: (el: any) => buttons.push(el) };
  const root = {
    ownerDocument: {
      createElement: () => ({
        className: "",
        innerHTML: "",
        attrs: {} as Record<string, string>,
        listeners: {} as Record<string, () => void>,
        setAttribute(n: string, v: string) {
          this.attrs[n] = v;
        },
        addEventListener(t: string, cb: () => void) {
          this.listeners[t] = cb;
        }
      })
    },
    querySelector: () => col
  };
  return { root, buttons };
}

function renderHud(token: any): any[] {
  let handler: ((hud: any, html: any) => void) | undefined;
  vi.stubGlobal("Hooks", { on: (_e: string, cb: any) => (handler = cb) });
  registerTokenHudActions();
  const { root, buttons } = fakeHud();
  handler?.({ object: token }, root);
  return buttons;
}

describe("Done firing on the rendered token HUD", () => {
  it("shows for the GM and its click ends the ship's activation via the scene tool's path", async () => {
    const w = world(LIVE);
    const done = renderHud(w.attacker).find((b) => b.attrs["data-action"] === "doneFiring");
    expect(done).toBeTruthy();
    done.listeners.click();
    await vi.waitFor(() => expect(w.order.activate).toHaveBeenCalledWith("a1"));
    expect(w.attacker.control).toHaveBeenCalledWith({ releaseOthers: true });
  });

  it("is not on a non-GM's HUD", () => {
    const w = world({ ...LIVE, gm: false });
    const keys = renderHud(w.attacker).map((b) => b.attrs["data-action"]);
    expect(keys).not.toContain("doneFiring");
  });

  it("is not on the HUD of the inactive side's ship", () => {
    const w = world(LIVE);
    const keys = renderHud(w.other).map((b) => b.attrs["data-action"]);
    expect(keys).not.toContain("doneFiring");
  });
});

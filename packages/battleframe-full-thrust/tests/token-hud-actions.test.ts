import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hudButtonModels,
  injectShipHudButtons,
  registerTokenHudActions
} from "../src/ui/token-hud-actions";

afterEach(() => vi.unstubAllGlobals());

const SHIP_TYPE = "battleframe-full-thrust.ship";

function shipActor(over: Record<string, any> = {}): any {
  return {
    type: SHIP_TYPE,
    system: {
      thrust: 4,
      driveHits: 0,
      fcs: 1,
      fcsLost: 0,
      bays: 0,
      weapons: [{ kind: "beam", destroyed: false, spent: false }],
      ...over
    }
  };
}

/** A fake button that records its wiring, standing in for a real DOM button. */
function fakeButton(): any {
  return {
    className: "",
    innerHTML: "",
    attrs: {} as Record<string, string>,
    listeners: {} as Record<string, () => void>,
    setAttribute(name: string, value: string) {
      this.attrs[name] = value;
    },
    addEventListener(type: string, cb: () => void) {
      this.listeners[type] = cb;
    }
  };
}

/** A fake HUD root exposing the minimal DOM surface the injector uses. */
function fakeHud(): { root: any; col: any; created: any[] } {
  const created: any[] = [];
  const col = {
    children: [] as any[],
    appendChild(el: any) {
      this.children.push(el);
    }
  };
  const root = {
    ownerDocument: {
      createElement(_tag: string) {
        const btn = fakeButton();
        created.push(btn);
        return btn;
      }
    },
    querySelector(sel: string) {
      return sel.includes("right") || sel.includes("left") ? col : null;
    }
  };
  return { root, col, created };
}

describe("hudButtonModels", () => {
  it("returns Plot and Fire for a healthy beam ship", () => {
    const keys = hudButtonModels(shipActor()).map((m) => m.key);
    expect(keys).toContain("plot");
    expect(keys).toContain("fire");
  });

  it("returns no buttons for a non-ship actor", () => {
    expect(hudButtonModels({ type: "battleframe-full-thrust.fighter-group" })).toEqual([]);
    expect(hudButtonModels({ type: "character" })).toEqual([]);
    expect(hudButtonModels(undefined)).toEqual([]);
  });

  it("adds carrier buttons only for a ship with bays", () => {
    const keys = hudButtonModels(shipActor({ bays: 2 })).map((m) => m.key);
    expect(keys).toContain("launchFighters");
    expect(keys).toContain("recoverFighters");
  });

  it("drops Fire when the ship has no live weapon", () => {
    const keys = hudButtonModels(shipActor({ weapons: [{ kind: "beam", destroyed: true }] })).map((m) => m.key);
    expect(keys).not.toContain("fire");
  });

  it("every model carries an icon and a tooltip key", () => {
    for (const m of hudButtonModels(shipActor({ bays: 1, weapons: [{ kind: "salvo" }, { kind: "beam" }] }))) {
      expect(m.icon).toMatch(/^fa-/);
      expect(m.tooltipKey).toContain("battleframe-full-thrust");
    }
  });
});

describe("injectShipHudButtons", () => {
  it("injects a button per model into the HUD column and wires its click", () => {
    const { root, col } = fakeHud();
    const clicked: string[] = [];
    const models = hudButtonModels(shipActor());
    const n = injectShipHudButtons(root, models, (key) => clicked.push(key));

    expect(n).toBe(models.length);
    expect(col.children).toHaveLength(models.length);
    // The Plot button carries the route icon and fires its action on click.
    const plotBtn = col.children.find((b: any) => b.attrs["data-action"] === "plot");
    expect(plotBtn).toBeTruthy();
    expect(plotBtn.innerHTML).toContain("fa-route");
    expect(plotBtn.attrs["data-tooltip"]).toBeTruthy();
    plotBtn.listeners.click();
    expect(clicked).toEqual(["plot"]);
  });

  it("injects nothing when there are no models", () => {
    const { root, col } = fakeHud();
    expect(injectShipHudButtons(root, [], () => {})).toBe(0);
    expect(col.children).toHaveLength(0);
  });

  it("is a no-op when the HUD has no column to attach to", () => {
    const root = { ownerDocument: { createElement: () => fakeButton() }, querySelector: () => null };
    expect(injectShipHudButtons(root as any, hudButtonModels(shipActor()), () => {})).toBe(0);
  });
});

describe("registerTokenHudActions", () => {
  it("registers a renderTokenHUD hook", () => {
    const on = vi.fn();
    vi.stubGlobal("Hooks", { on });
    registerTokenHudActions();
    expect(on).toHaveBeenCalledWith("renderTokenHUD", expect.any(Function));
  });

  it("injects ship buttons when the hook fires for a ship token", () => {
    let handler: ((hud: any, html: any) => void) | undefined;
    vi.stubGlobal("Hooks", { on: (_e: string, cb: any) => (handler = cb) });
    registerTokenHudActions();
    const { root, col } = fakeHud();
    handler?.({ object: { actor: shipActor(), control: vi.fn() } }, root);
    expect(col.children.length).toBeGreaterThan(0);
  });

  it("injects nothing for a non-ship token", () => {
    let handler: ((hud: any, html: any) => void) | undefined;
    vi.stubGlobal("Hooks", { on: (_e: string, cb: any) => (handler = cb) });
    registerTokenHudActions();
    const { root, col } = fakeHud();
    handler?.({ object: { actor: { type: "character" } } }, root);
    expect(col.children).toHaveLength(0);
  });
});

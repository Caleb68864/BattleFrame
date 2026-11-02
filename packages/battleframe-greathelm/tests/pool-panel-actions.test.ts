import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPoolPanelClass } from "../src/ui/pool-panel";
import { withScenarioProfile } from "./helpers/world";

let restore: () => void;
beforeEach(() => {
  restore = withScenarioProfile();
});
afterEach(() => {
  restore();
});

class Base {
  constructor(public options: Record<string, unknown> = {}) {}
  async render(): Promise<this> {
    return this;
  }
}

function panelClass(): any {
  return createPoolPanelClass(Base as any, ((b: unknown) => b) as any);
}

function panel(spendDie = vi.fn(async () => undefined)): any {
  const session = {
    remainingDice: () => [],
    activePlayerId: () => "a",
    legalTargetsFor: () => [],
    spendDie,
    isComplete: () => false,
  };
  const Panel = panelClass();
  return new Panel({ session, knights: [], highlights: { update: vi.fn(), close: vi.fn() } });
}

describe("pool panel clicks use ApplicationV2's declarative actions map", () => {
  it("declares selectDie and spendOnKnight actions", () => {
    const actions = panelClass().DEFAULT_OPTIONS.actions;

    expect(typeof actions?.selectDie).toBe("function");
    expect(typeof actions?.spendOnKnight).toBe("function");
  });

  it("the selectDie action reads the die id off the clicked element, with the panel as this", () => {
    const app = panel();

    panelClass().DEFAULT_OPTIONS.actions.selectDie.call(app, {}, { dataset: { dieId: "d9" } });

    expect(app.selectedDieId).toBe("d9");
  });

  it("the spendOnKnight action spends the selected die on the clicked knight", async () => {
    vi.stubGlobal("game", { ...(globalThis as any).game, user: { isGM: true } });
    const spendDie = vi.fn(async () => undefined);
    const app = panel(spendDie);
    app.selectedDieId = "d9";

    await panelClass().DEFAULT_OPTIONS.actions.spendOnKnight.call(app, {}, { dataset: { knightId: "k1" } });

    expect(spendDie).toHaveBeenCalledWith("d9", "k1");
  });

  it("no longer hand-wires listeners in _onRender, which would double every click", async () => {
    const app = panel();
    const addEventListener = vi.fn();
    app.element = {
      querySelectorAll: () => [{ addEventListener, dataset: { dieId: "d9" } }],
    };

    await app._onRender?.({}, {});

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("the template routes clicks through data-action", () => {
    const hbs = readFileSync(resolve(__dirname, "../templates/pool-panel.hbs"), "utf8");

    expect(hbs).toContain('data-action="selectDie"');
    expect(hbs).toContain('data-action="spendOnKnight"');
  });
});

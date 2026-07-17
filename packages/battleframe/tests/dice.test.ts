import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiceApi, installDiceApi } from "../src/dice/dice";

class MockRoll {
  formula: string;
  total = 0;

  constructor(formula: string, public data?: Record<string, unknown>) {
    this.formula = formula;
  }

  async evaluate(): Promise<this> {
    this.total = 7;
    return this;
  }
}

beforeEach(() => {
  vi.stubGlobal("Roll", MockRoll);
  vi.stubGlobal("Handlebars", {
    compile: (template: string) => (data: Record<string, unknown>) =>
      template.replace(/{{\s*(\w+)\s*}}/g, (_match, key) => String(data[key] ?? "")),
  });
  vi.stubGlobal("ChatMessage", { create: vi.fn(async () => undefined) });
  vi.stubGlobal("game", undefined);
});

describe("dice.roll", () => {
  it("returns a standard Foundry Roll, not a wrapper type", async () => {
    const dice = createDiceApi();
    const result = await dice.roll("2d6+3");

    expect(result).toBeInstanceOf(MockRoll);
    expect(result.formula).toBe("2d6+3");
  });

  it("resolves normally and posts a chat card with no Dice So Nice present", async () => {
    const dice = createDiceApi();
    const result = await dice.roll("1d20", undefined, { rulesetId: "test-ruleset" });

    expect(result.total).toBe(7);

    const chatMessage = (globalThis as unknown as {
      ChatMessage: { create: ReturnType<typeof vi.fn> };
    }).ChatMessage;

    expect(chatMessage.create).toHaveBeenCalledTimes(1);
    const [payload] = chatMessage.create.mock.calls[0];
    expect(payload.content).toContain("1d20");
    expect(payload.content).toContain("test-ruleset");
  });

  it("installs onto game.battleframe.dice", () => {
    vi.stubGlobal("game", {});
    const api = installDiceApi();

    const g = (globalThis as unknown as {
      game: { battleframe?: { dice?: unknown } };
    }).game;

    expect(g.battleframe?.dice).toBe(api);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiceApi, installDiceApi } from "../src/dice/dice";

const toMessage = vi.fn(async (_data?: Record<string, unknown>) => undefined);

class MockRoll {
  formula: string;
  total = 0;
  dice?: Array<{ results: Array<{ result: number; active: boolean }> }>;
  toMessage = toMessage;

  constructor(formula: string, public data?: Record<string, unknown>) {
    this.formula = formula;
  }

  async evaluate(): Promise<this> {
    this.total = 7;
    // For a dice formula "Nd..", also expose N faces (1,2,3,...) so pool reads work.
    const match = /^(\d+)d\d+/.exec(this.formula);
    if (match) {
      const count = Number(match[1]);
      this.dice = [
        { results: Array.from({ length: count }, (_v, i) => ({ result: i + 1, active: true })) }
      ];
    }
    return this;
  }
}

beforeEach(() => {
  toMessage.mockClear();
  vi.stubGlobal("Roll", MockRoll);
  vi.stubGlobal("ChatMessage", {
    create: vi.fn(async () => undefined),
    getSpeaker: () => ({ alias: "Speaker" }),
  });
  vi.stubGlobal("game", undefined);
});

describe("dice.rollPool", () => {
  it("rolls the whole pool as ONE Roll and ONE chat card, returning each face", async () => {
    const dice = createDiceApi();
    const faces = await dice.rollPool(5, 10, { rulesetId: "inx" });

    expect(faces).toEqual([1, 2, 3, 4, 5]); // five faces, not five rolls
    expect(toMessage).toHaveBeenCalledTimes(1); // one message, not five
  });

  it("rolls nothing (and posts nothing) for an empty pool", async () => {
    const dice = createDiceApi();
    const faces = await dice.rollPool(0, 10);
    expect(faces).toEqual([]);
    expect(toMessage).not.toHaveBeenCalled();
  });
});

describe("dice.roll", () => {
  it("returns a standard Foundry Roll, not a wrapper type", async () => {
    const dice = createDiceApi();
    const result = await dice.roll("2d6+3");

    expect(result).toBeInstanceOf(MockRoll);
    expect(result.formula).toBe("2d6+3");
  });

  it("posts through Roll#toMessage with a speaker, the flavor and the ruleset id", async () => {
    const dice = createDiceApi();
    const result = await dice.roll("1d20", undefined, { rulesetId: "test-ruleset", flavor: "to hit" });

    expect(result.total).toBe(7);
    expect(toMessage).toHaveBeenCalledTimes(1);
    expect(toMessage.mock.calls[0][0]).toEqual({
      speaker: { alias: "Speaker" },
      flavor: "to hit",
      flags: { battleframe: { rulesetId: "test-ruleset" } },
    });
  });

  it("does not hand-build message content, which would suppress the native breakdown", async () => {
    await createDiceApi().roll("2d6");

    expect(toMessage.mock.calls[0][0]).not.toHaveProperty("content");
    const chatMessage = (globalThis as unknown as {
      ChatMessage: { create: ReturnType<typeof vi.fn> };
    }).ChatMessage;
    expect(chatMessage.create).not.toHaveBeenCalled();
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

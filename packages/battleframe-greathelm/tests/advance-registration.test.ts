import { describe, expect, it, vi, afterEach } from "vitest";
import { registerGreathelmAdvance } from "../src/main";

afterEach(() => {
  delete (globalThis as { battleframe?: unknown }).battleframe;
  delete (globalThis as { game?: unknown }).game;
});

describe("registerGreathelmAdvance", () => {
  it("registers a round-advance callback with the engine's advance service", () => {
    const registerAdvance = vi.fn();
    (globalThis as { battleframe?: unknown }).battleframe = { advance: { registerAdvance } };

    registerGreathelmAdvance();

    expect(registerAdvance).toHaveBeenCalledTimes(1);
    expect(typeof registerAdvance.mock.calls[0][0]).toBe("function");
  });

  it("resolves the advance service off the bound game.battleframe too", () => {
    const registerAdvance = vi.fn();
    (globalThis as { game?: unknown }).game = { battleframe: { advance: { registerAdvance } } };

    registerGreathelmAdvance();

    expect(registerAdvance).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the engine advance service is absent", () => {
    expect(() => registerGreathelmAdvance()).not.toThrow();
  });
});

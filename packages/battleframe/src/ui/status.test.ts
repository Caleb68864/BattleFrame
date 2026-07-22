import { afterEach, describe, expect, it, vi } from "vitest";
import { createStatusApi } from "./status";

afterEach(() => vi.unstubAllGlobals());

describe("status registry", () => {
  it("registers an effect onto CONFIG.statusEffects", () => {
    const CONFIG: any = { statusEffects: [] };
    vi.stubGlobal("CONFIG", CONFIG);
    const status = createStatusApi();

    status.register({ id: "test-a", name: "T.a", img: "icons/svg/aura.svg" });

    expect(CONFIG.statusEffects).toHaveLength(1);
    expect(CONFIG.statusEffects[0].id).toBe("test-a");
  });

  it("is idempotent -- a repeat id is not duplicated", () => {
    const CONFIG: any = { statusEffects: [] };
    vi.stubGlobal("CONFIG", CONFIG);
    const status = createStatusApi();

    status.register({ id: "test-a", name: "T.a", img: "icons/svg/aura.svg" });
    status.register({ id: "test-a", name: "T.a", img: "icons/svg/aura.svg" });

    expect(CONFIG.statusEffects.filter((e: any) => e.id === "test-a")).toHaveLength(1);
  });

  it("initialises CONFIG.statusEffects if Foundry has not yet", () => {
    const CONFIG: any = {};
    vi.stubGlobal("CONFIG", CONFIG);
    createStatusApi().register({ id: "test-b", name: "T.b", img: "icons/svg/aura.svg" });
    expect(CONFIG.statusEffects).toHaveLength(1);
  });

  it("does nothing when CONFIG is absent (pre-init / tests)", () => {
    vi.stubGlobal("CONFIG", undefined);
    expect(() => createStatusApi().register({ id: "x", name: "x", img: "x" })).not.toThrow();
  });
});

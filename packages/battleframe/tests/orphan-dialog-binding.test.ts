import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveConversionPrompt } from "../src/rulesets/orphan-check";

/**
 * Foundry's static confirm reads `this` (`this.wait(...)`). Detached it throws, the
 * catch answers "no", and the GM is silently never offered the conversion.
 */
function thisReading(answer: unknown) {
  return {
    confirm(this: unknown): Promise<unknown> {
      if (this === undefined) throw new TypeError("detached confirm");
      return Promise.resolve(answer);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveConversionPrompt calls dialogs as methods", () => {
  it("reaches a this-reading DialogV2.confirm", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: thisReading(true) } } });

    expect(await resolveConversionPrompt()?.confirm("convert?")).toBe(true);
  });

  it("reaches a this-reading v1 Dialog.confirm", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("foundry", undefined);
    vi.stubGlobal("Dialog", thisReading(true));

    expect(await resolveConversionPrompt()?.confirm("convert?")).toBe(true);
  });
});

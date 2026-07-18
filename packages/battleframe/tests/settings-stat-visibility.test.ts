import { afterEach, describe, expect, it, vi } from "vitest";
import { getStatVisibilitySetting, SETTING_STAT_VISIBILITY } from "../src/settings";
import { SYSTEM_ID } from "../src/constants";

afterEach(() => { delete (globalThis as { game?: unknown }).game; });

describe("getStatVisibilitySetting", () => {
  it("defaults to 'ruleset' when settings are unavailable", () => {
    expect(getStatVisibilitySetting()).toBe("ruleset");
  });
  it("reads the stored value from the system namespace", () => {
    (globalThis as { game?: unknown }).game = {
      settings: { get: vi.fn((ns: string, key: string) =>
        ns === SYSTEM_ID && key === SETTING_STAT_VISIBILITY ? "owners" : undefined) },
    };
    expect(getStatVisibilitySetting()).toBe("owners");
  });
});

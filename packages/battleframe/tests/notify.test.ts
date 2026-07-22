/**
 * notify service: a defensive wrapper over `ui.notifications` (info/warn/error)
 * that falls back to the console when notifications are unavailable, and — the
 * live-caught lesson — calls the reporter as a METHOD so Foundry's own
 * info/warn/error keep their `this`. Three modules had byte-identical copies
 * (QoL→engine scan #2).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotifyApi } from "../src/ui/notify";

afterEach(() => vi.unstubAllGlobals());
const api = createNotifyApi();

describe("notify", () => {
  it("routes info/warn/error to ui.notifications, preserving `this`", () => {
    const calls: string[] = [];
    const notifications = {
      _tag: "real",
      info(this: any, m: string) { calls.push(`info:${this._tag}:${m}`); },
      warn(this: any, m: string) { calls.push(`warn:${this._tag}:${m}`); },
      error(this: any, m: string) { calls.push(`error:${this._tag}:${m}`); }
    };
    vi.stubGlobal("ui", { notifications });
    api.info("a");
    api.warn("b");
    api.error("c");
    // The reporter ran with its own object as `this` (a detached ref would lose it).
    expect(calls).toEqual(["info:real:a", "warn:real:b", "error:real:c"]);
  });

  it("falls back to the console when notifications are unavailable", () => {
    const log = vi.fn();
    vi.stubGlobal("ui", {});
    vi.stubGlobal("console", { ...console, log });
    api.info("hello");
    expect(log).toHaveBeenCalled();
  });
});

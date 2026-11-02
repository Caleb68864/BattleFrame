import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { previewTargeting } from "../src/combat/targeting";
import { firePhaseStatusLine, sideLabel } from "../src/round/fire-session";
import { buildSpinalReportHtml } from "../src/ui/round-control";
import { withRules } from "./helpers/world";

let restore: () => void;
beforeEach(() => {
  restore = withRules();
  // Hands back the key, so any string that skipped localization shows up as English.
  (globalThis as any).game.i18n = {
    format: (key: string) => `[${key}]`,
    localize: (key: string) => `[${key}]`,
  };
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

const order = (active: string | undefined, remaining: string[]) =>
  ({
    activeSideId: () => active,
    isComplete: () => active === undefined,
    eligible: () => remaining,
  }) as never;

describe("chat cards localize every string they print", () => {
  it("the fire-phase tracker", () => {
    expect(firePhaseStatusLine(order("1", ["a"]))).toMatch(/^\[battleframe-full-thrust\./);
    expect(firePhaseStatusLine(order(undefined, []))).toMatch(/^\[battleframe-full-thrust\./);
    expect(sideLabel("1")).toMatch(/^\[battleframe-full-thrust\./);
    expect(sideLabel("7")).toMatch(/^\[battleframe-full-thrust\./);
  });

  it("the targeting rows", () => {
    const weapons = [
      { kind: "beam", weaponClass: 1, arcs: ["F"] },
      { kind: "beam", weaponClass: 1, arcs: ["A"] },
      { kind: "needle", arcs: ["F"] },
      { kind: "salvo", arcs: ["F"] },
      { kind: "beam", arcs: ["F"] },
    ] as never;

    for (const row of previewTargeting({ weapons, distanceMu: 1, bearing: 0 })) {
      expect(row.effect).toMatch(/^\[battleframe-full-thrust\./);
    }
  });

  it("the spinal card's heading", () => {
    const html = buildSpinalReportHtml(
      {
        weapon: "Nova Cannon",
        outOfRange: true,
        distance: 1,
        totalDamage: 0,
        thresholdsCrossed: [],
        systemsKnockedOut: 0,
        destroyed: false,
      } as never,
      "Target"
    );

    expect(html).toContain("[battleframe-full-thrust.report.spinalHeading]");
  });
});

describe("the dice-count string states the world's die", () => {
  it("is passed to the translation rather than printed as a d6", () => {
    const format = vi.fn((key: string) => key);
    (globalThis as any).game.i18n = { format, localize: (k: string) => k };
    const size = (globalThis as any).game.settings.get("battleframe-full-thrust", "rulesProfile").dieSize;

    previewTargeting({ weapons: [{ kind: "beam", weaponClass: 1, arcs: ["F"] }] as never, distanceMu: 1, bearing: 0 });

    const call = format.mock.calls.find(([key]) => String(key).endsWith("targeting.dice")) as unknown as [string, { size: number }];
    expect(call[1].size).toBe(size);
  });
});

describe("every localization key the source names exists in en.json", () => {
  const root = resolve(__dirname, "../src");
  const files = (readdirSync(root, { recursive: true }) as string[])
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join(root, file));

  it("has no dangling key", () => {
    const missing: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const match of src.matchAll(/\btr\(\s*`\$\{REPORT\}\.([\w.]+)`/g)) {
        const key = `battleframe-full-thrust.report.${match[1]}`;
        if (!(key in langEn)) missing.push(key);
      }
      for (const match of src.matchAll(/\btr\(\s*"(battleframe-full-thrust\.[\w.]+)"/g)) {
        if (!(match[1] in langEn)) missing.push(match[1]);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("report cards carry a speaker", () => {
  it("posts through ChatMessage.getSpeaker", async () => {
    const create = vi.fn(async () => undefined);
    const getSpeaker = vi.fn(() => ({ alias: "Speaker" }));
    vi.stubGlobal("ChatMessage", { create, getSpeaker });
    const { postReportCard } = await import("../src/ui/round-control");

    await postReportCard({ content: "<p>x</p>" });

    expect(create).toHaveBeenCalledWith({ content: "<p>x</p>", speaker: { alias: "Speaker" } });
  });

  it("no raw ChatMessage.create is left in the round control", () => {
    const src = readFileSync(resolve(__dirname, "../src/ui/round-control.ts"), "utf8");
    // postReportCard reaches it through its own local; nothing else calls it.
    expect(src).not.toContain("ChatMessage?.create(");
  });
});

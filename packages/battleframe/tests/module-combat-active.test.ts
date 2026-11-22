import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every ruleset that creates its own Combat must activate it (2026-11-21). Created
 * inactive, it is neither `game.combat` nor `game.combats.active`, so the module's
 * next round could not find it and created another, and the engine's ready flags
 * (kept on `combats.active`) went elsewhere. Behaviour tests cover Simple Skirmish
 * and InCountry; this scan covers every module, Dirtside II and Stargrunt II included.
 */
const PACKAGES = resolve(__dirname, "../..");

function moduleSources(): { file: string; source: string }[] {
  const out: { file: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        out.push({ file: path.slice(PACKAGES.length + 1), source: readFileSync(path, "utf8") });
      }
    }
  };
  for (const pkg of readdirSync(PACKAGES)) {
    if (pkg === "battleframe" || !pkg.startsWith("battleframe")) continue;
    try {
      walk(join(PACKAGES, pkg, "src"));
    } catch {
      /* no src */
    }
  }
  return out;
}

describe("a module's own Combat is created active", () => {
  it("activates each Combat it creates", () => {
    const creators = moduleSources().filter(({ source }) => /\bCombat\.create\(/.test(source));
    expect(creators.length).toBeGreaterThanOrEqual(4);
    for (const { file, source } of creators) {
      for (const match of source.matchAll(/\bCombat\.create\(/g)) {
        const after = source.slice(match.index, (match.index ?? 0) + 400);
        expect(after, `${file}: Combat.create without activate`).toMatch(/\.activate\?*\.?\(/);
      }
    }
  });
});

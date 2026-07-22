import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every literal `battleframe-stargrunt-ii.*` key the code and templates reference
 * must exist in en.json — the scene-control titles and the sheet label are full
 * literals, exactly the kind that silently degrade to the raw key.
 */
const PKG_ROOT = join(__dirname, "..");
const LANG = JSON.parse(readFileSync(join(PKG_ROOT, "lang", "en.json"), "utf8"));

function flatten(object: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      for (const nested of flatten(value as Record<string, unknown>, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

function filesUnder(dir: string, extensions: readonly string[]): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory()
      ? filesUnder(full, extensions)
      : extensions.some((ext) => full.endsWith(ext))
        ? [full]
        : [];
  });
}

const LANG_KEYS = flatten(LANG);

describe("i18n completeness", () => {
  it("every literal battleframe-stargrunt-ii key in src and templates exists in en.json", () => {
    const referenced = new Set<string>();
    const sources = [
      ...filesUnder(join(PKG_ROOT, "src"), [".ts"]),
      ...filesUnder(join(PKG_ROOT, "templates"), [".hbs"])
    ];

    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/["'](battleframe-stargrunt-ii\.[a-zA-Z0-9_.]+)["']/g)) {
        referenced.add(match[1]);
      }
    }

    const missing = [...referenced].filter((key) => !LANG_KEYS.has(key)).sort();

    expect(referenced.size).toBeGreaterThan(3);
    expect(missing).toEqual([]);
  });
});

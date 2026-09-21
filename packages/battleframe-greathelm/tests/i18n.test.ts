import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_IDS } from "../src/constants";

/**
 * Missing i18n keys have shipped in this project more than once -- three keys
 * resolved to raw strings in the live world while every unit test passed,
 * because nothing asserted the *language file* actually carried them. The
 * exhaustive `Record<union, key>` objects (ACTION_NAME_KEYS, ILLEGAL_REASON_KEYS)
 * guarantee a key *string* exists for every case; they do not guarantee that
 * string resolves in en.json. This test closes that gap: every key the code
 * references -- both the literal `"battleframe-greathelm.x"` strings and the
 * families built from unions -- must exist in the language file.
 */
const PKG_ROOT = join(__dirname, "..");
const LANG = JSON.parse(readFileSync(join(PKG_ROOT, "lang", "en.json"), "utf8"));

/** Foundry resolves dotted keys against a nested object; flatten to match. */
function flatten(object: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object") {
      for (const nested of flatten(value as Record<string, unknown>, path)) {
        keys.add(nested);
      }
    } else {
      keys.add(path);
    }
  }

  return keys;
}

function tsFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory()
      ? tsFilesUnder(full)
      : full.endsWith(".ts")
        ? [full]
        : [];
  });
}

const LANG_KEYS = flatten(LANG);

describe("i18n completeness", () => {
  it("every literal battleframe-greathelm key referenced in source exists in en.json", () => {
    const referenced = new Set<string>();

    for (const file of tsFilesUnder(join(PKG_ROOT, "src"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/"(battleframe-greathelm\.[a-zA-Z0-9_.]+)"/g)) {
        referenced.add(match[1]);
      }
    }

    const missing = [...referenced].filter((key) => !LANG_KEYS.has(key)).sort();

    // Guard the guard: if the regex ever stops finding keys, this test would
    // pass vacuously. There are dozens of literal keys in the source.
    expect(referenced.size).toBeGreaterThan(20);
    expect(missing).toEqual([]);
  });

  /**
   * Keyed off the module's own vocabulary rather than off a face-to-action
   * table. The table used to live in `constants.ts`; it is the world's now, so
   * a world could map only three faces and this test would have silently
   * stopped checking the other three actions' strings. `ACTION_IDS` is what the
   * module ships, and every one of them needs a name and a hint.
   */
  it("every action this module knows has a name and a hint key", () => {
    const actions = ACTION_IDS;
    const missing: string[] = [];

    for (const action of actions) {
      for (const key of [
        `battleframe-greathelm.actions.${action}`,
        `battleframe-greathelm.actionHint.${action}`,
      ]) {
        if (!LANG_KEYS.has(key)) {
          missing.push(key);
        }
      }
    }

    expect(actions.length).toBe(6);
    expect(missing).toEqual([]);
  });
});

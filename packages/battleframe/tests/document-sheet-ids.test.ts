import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A document sheet's `id` must keep Foundry's `{id}` placeholder. DocumentSheetV2
 * fills it per document; a fixed string gives every open sheet of that type the
 * same application id and DOM id, so a second sheet collides with the first in
 * `foundry.applications.instances` and in the page. (2026-11-21 audit: every
 * sheet in the monorepo had a fixed id.)
 *
 * Scans every package's sheet sources, since each module defines its own.
 */

const PACKAGES = resolve(__dirname, "../..");

function sheetSources(): { file: string; source: string }[] {
  const out: { file: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && !entry.name.includes("wizard")) {
        // The setup wizard is one window, not a sheet per document; a fixed id is right there.
        const source = readFileSync(path, "utf8");
        if (/extends\s*\(?\s*(?:MixedBase|Base|base)\b/.test(source) && /ActorSheetV2/.test(source)) {
          out.push({ file: path.slice(PACKAGES.length + 1), source });
        }
      }
    }
  };
  for (const pkg of readdirSync(PACKAGES)) {
    try {
      walk(join(PACKAGES, pkg, "src"));
    } catch {
      /* a package without src */
    }
  }
  return out;
}

describe("document sheets keep a per-document id", () => {
  it("finds the sheets it guards", () => {
    expect(sheetSources().length).toBeGreaterThanOrEqual(10);
  });

  it("every sheet id carries the {id} placeholder", () => {
    for (const { file, source } of sheetSources()) {
      for (const [, id] of source.matchAll(/DEFAULT_OPTIONS\s*=\s*\{[\s\S]*?\bid:\s*`([^`]*)`/g)) {
        expect(id, `${file}: sheet id "${id}" is the same for every document`).toContain("{id}");
      }
    }
  });
});

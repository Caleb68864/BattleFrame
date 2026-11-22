import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The unit sheet was entirely hard-coded English (2026-11-21 audit): headings,
 * labels, column heads, tooltips and the empty-list line. Every piece of text a
 * player reads now goes through `{{localize}}`. This strips the markup and the
 * Handlebars expressions and fails on any letter left over, and on any `title`
 * attribute that is not a localize call.
 */
const TEMPLATE = readFileSync(join(__dirname, "..", "templates", "unit-sheet.hbs"), "utf8");

describe("the unit sheet is localized", () => {
  it("has no raw text between its tags", () => {
    const text = TEMPLATE.replace(/\{\{!--[\s\S]*?--\}\}/g, " ")
      .replace(/\{\{[\s\S]*?\}\}/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&[A-Za-z]+;/g, " ");
    expect(text.match(/[A-Za-z]{2,}/g) ?? []).toEqual([]);
  });

  it("localizes every tooltip", () => {
    for (const [, title] of TEMPLATE.matchAll(/title="((?:\{\{[^}]*\}\}|[^"{])*)"/g)) {
      expect(title, title).toMatch(/^\{\{localize "[^"]+"\}\}$/);
    }
  });
});

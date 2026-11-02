import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Stripping a table from the code and leaving it in the comment above still ships
 * the table. These shapes are what a published number looks like in prose: a
 * distance, a dice pool, a per-die table.
 */
const SHAPES = [/\b\d+ ?mu\b/, /\b\d+ ?[dD]6\b/, /\b\d-\d ?(=|nothing)/, /\b\d = \d\b/, /\b\d\+\/\d\+/];

function commentText(line: string): string | undefined {
  const block = /^\s*(?:\*|\/\*\*?)\s?(.*)$/.exec(line);
  if (block) return block[1];
  const trailing = /(?:^|\s)\/\/\s?(.*)$/.exec(line);
  return trailing ? trailing[1] : undefined;
}

describe("source comments carry no published numbers", () => {
  it("finds none of the shapes in any comment", () => {
    const root = resolve(__dirname, "../src");
    const hits: string[] = [];
    for (const file of readdirSync(root, { recursive: true }) as string[]) {
      if (!file.endsWith(".ts")) continue;
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .forEach((line, index) => {
          const comment = commentText(line);
          if (comment && SHAPES.some((shape) => shape.test(comment))) {
            hits.push(`${file}:${index + 1}`);
          }
        });
    }
    expect(hits).toEqual([]);
  });
});

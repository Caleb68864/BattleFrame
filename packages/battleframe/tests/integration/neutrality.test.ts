import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const CORE_SRC = join(REPO_ROOT, "packages", "battleframe", "src");
const CORE_TESTS = join(REPO_ROOT, "packages", "battleframe", "tests");

function listFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// Built from parts so this checker file itself doesn't trip its own scan.
const RULESET_PACKAGE_NAME = ["battleframe", "greathelm"].join("-");

// Matches only actual import/require specifiers pointing at the ruleset
// package, not incidental prose mentions of its name in a comment.
const RULESET_IMPORT_PATTERN = new RegExp(
  `(?:from|require\\()\\s*["'][^"']*${RULESET_PACKAGE_NAME}[^"']*["']`
);

describe("neutrality", () => {
  it("no file under packages/battleframe/src imports from packages/battleframe-greathelm", () => {
    const offenders = listFiles(CORE_SRC)
      .filter((path) => path.endsWith(".ts"))
      .filter((path) => RULESET_IMPORT_PATTERN.test(readFileSync(path, "utf8")));

    expect(offenders).toEqual([]);
  });

  it("the core test suite imports no ruleset package", () => {
    const offenders = listFiles(CORE_TESTS)
      .filter((path) => path.endsWith(".test.ts"))
      .filter((path) => RULESET_IMPORT_PATTERN.test(readFileSync(path, "utf8")));

    expect(offenders).toEqual([]);
  });
});

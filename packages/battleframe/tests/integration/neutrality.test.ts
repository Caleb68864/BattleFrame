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

  // The import check catches a *dependency* on the ruleset. It does not catch
  // core learning a ruleset's *vocabulary* -- a `if (actor.type === "knight")`
  // or a comment reasoning about momentum -- which is the subtler way neutrality
  // rots: no import, but core now knows what a GREATHELM concept is. The
  // decision log calls this vocabulary check "the load-bearing one ... the
  // mechanical proof that core stays ruleset-neutral", and it had only ever
  // been a spec criterion, never an automated test. It is one now.
  //
  // The terms are GREATHELM proper nouns with no generic engineering meaning --
  // core has no legitimate reason to say "knight" or "warband". Built from parts
  // so this checker never trips over its own source.
  const RULESET_VOCABULARY = [
    "greathelm",
    "kni" + "ght",
    "mom" + "entum",
    "cou" + "rage",
    "war" + "band",
  ];
  const VOCABULARY_PATTERN = new RegExp(`\\b(${RULESET_VOCABULARY.join("|")})\\b`, "i");

  it("no file under packages/battleframe/src speaks a ruleset's vocabulary", () => {
    const offenders = listFiles(CORE_SRC)
      .filter((path) => path.endsWith(".ts"))
      .filter((path) => VOCABULARY_PATTERN.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(REPO_ROOT.length + 1));

    expect(offenders).toEqual([]);
  });
});

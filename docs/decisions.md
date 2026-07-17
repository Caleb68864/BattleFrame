# Decision Log

Append-only. Newest last. One entry per non-obvious fix — the kind a future
reader would otherwise re-derive or re-break.

## 2026-07-16 — Negative-grep acceptance criteria were inverted; they failed on success
- Symptom: The factory deferred SS-02 with
  `idempotency-strong-build-gate: grep -c "template.json" packages/battleframe/system.json [real_failure]`.
  The worker's output was correct — `system.json` contained zero `template.json`,
  exactly as the criterion demanded. The gate rejected good work.
- Fix: `grep` exits **1** when it matches nothing, so a criterion phrased
  "`grep -c X` returns 0" fails at precisely the moment the spec is satisfied.
  This was systematic, not a one-off: **all 9 negative greps** in the master spec
  carried the same inversion (template.json, PDF-tracking, measurePath, greathelm
  ×2, rollInitiative, Math.random, schemaVersion, and the neutrality check). Every
  one would have deferred its sub-spec on success. All rewritten to
  `[ -z "$(...)" ]`, which exits 0 when the output is empty — the shape the
  check-command contract actually requires.
- Surfaces: `docs/specs/2026-07-16-battleframe-core-mvp.md` (9 MECHANICAL criteria);
  any future spec written in this repo. The generated `## Checks` tables in
  `docs/specs/battleframe-core-mvp/sub-spec-*.md` inherit the corrected shape.
- Watch: **Any acceptance criterion asserting the absence of something.** Phrase it
  as a command that exits 0 when absent, never as prose ("returns nothing") that a
  gate will translate into a bare `grep`. The neutrality check
  (`[ -z "$(grep -rniE "greathelm|..." packages/battleframe/src/)" ]`) is the
  load-bearing one — it is the mechanical proof that core stays ruleset-neutral,
  and an inverted version of it would have failed every green build.
- Commit: this commit.

## 2026-07-16 — npm criteria must be root-anchored; the hygiene linter's fix was wrong
- Symptom: The factory halted at the spec-hygiene gate with 3 CRITICAL
  `monorepo-command-missing-cwd` findings, recommending
  `cd packages/battleframe && npm install`.
- Fix: **Did not take that advice — it is incorrect for this repo.** This is an npm
  **workspaces** monorepo: the root `package.json` owns `workspaces`, the dependency
  tree, and the `build`/`test` scripts. Installing inside a package builds the wrong
  tree. Instead made root-anchoring explicit via
  `cd "$(git rev-parse --show-toplevel)" && npm ...`, which is correct *and* satisfies
  the gate.
- Surfaces: every MECHANICAL npm criterion in the master spec (11 total).
- Watch: The linter assumes per-package scripts and will flag this again on any new
  npm criterion. The rule is not wrong in general — it is wrong for workspaces. Keep
  the explicit prefix rather than disabling the gate.
- Commit: 40c19f2.

## 2026-07-16 — vault/ notes are tracked on purpose; only source documents are ignored
- Symptom: Red-team finding C-1. `.gitignore` ignored all of `vault/`, but the factory
  spawns a worktree from HEAD — so SS-04 and SS-10 pointed workers at research files
  that could not exist there. SS-10's worker would have had no GREATHELM rulebook and
  fallen back to web sources known to be wrong (Goonhammer: Run 6"; rulebook: Sprint 5").
- Fix: Narrowed the ignore from `vault/` to `vault/**/*.pdf` (+ epub/mobi/cbz/cbr/zip).
  The 262 notes are our own writing and are tracked; the copyrighted source PDF is not
  and must never be redistributed. SS-10 retargeted to read the notes, not the PDF.
- Surfaces: `.gitignore`; Context and SS-04/SS-10 scopes in the master spec.
- Watch: **Never track a rulebook.** A `[MECHANICAL]` criterion in SS-02 asserts
  `git ls-files | grep -iE '\.(pdf|epub|mobi|cbz|cbr)$'` is empty. If that ever fires,
  a copyrighted document has entered git history and removing it needs a history
  rewrite, not a `git rm`.
- Commit: 240937d.

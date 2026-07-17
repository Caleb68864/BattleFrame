---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/releases/14.352 , https://github.com/foundryvtt/foundryvtt/issues/13429
confidence: confirmed
---

# template.json vs DataModels

`template.json` was the pre-v10 way a system declared the shape of `system` data. `TypeDataModel` replaced it ([[typedatamodel-defineschema-and-data-preparation]]).

**As of v14, `template.json` is formally deprecated.** Verbatim from the [Release 14.352](https://foundryvtt.com/releases/14.352) breaking changes, Package Development section (issue [#13429](https://github.com/foundryvtt/foundryvtt/issues/13429)):

> "The legacy system `template.json` specification has entered its deprecation period, requiring system types to either have an unspecified schema or a schema defined via a `TypeDataModel`."

Also deprecated: **`System#template`** — "all the relevant information is now contained in `System#documentTypes` and `Game#model`." The sanitization info (`htmlFields`, `gmOnlyFields`) moved into `System#documentTypes`.

**It still functions in v14.** Evidence from real shipping systems:
- **pf2e 8.3.0** (released 2026-07-06) still ships `static/template.json`.
- **dnd5e 5.3.3** ships **no** `template.json` — fully DataModel-driven.
- [[custom-system-builder-is-the-key-precedent|CSB]] (v14-verified) has no `template.json`.

The current system-development and system-data-models articles no longer mention it at all.

**Verdict: do not write a `template.json` for a new system.** Use `documentTypes` in `system.json` + `CONFIG.<Doc>.dataModels` ([[registering-a-typedatamodel-at-init]]).

**Not found:** the removal version. Issue #13429 has no description body and the release notes give no end-of-period version. Deprecation periods in Foundry have run ~4 majors historically, but do not treat that as a date.

---
tags: [wargame-research, one-page-rules, data-acquisition]
source: inference
confidence: unverified
---

# Verdict: The Real Engineering Risk Is Schema Drift, Not Parsing

**This note is inference, not observation.** It is a risk assessment reasoned from confirmed facts, flagged plainly so it is not mistaken for a finding.

Parsing is a solved problem ([[verdict-parsing-needs-no-llm]]). The durable risk sits elsewhere.

## The risk

The Army Forge API is **undocumented, unversioned, unannounced, and internal** ([[army-forge-api-exists-but-is-undocumented]]). OPR owes no stability guarantee to consumers they never invited and may not know exist. Any release could rename a field, change `quality` from number to string, or restructure `upgradePackages` — and nothing would announce it.

There is already a concrete tell in the evidence: `quality`/`defense` are typed `string` in the community definitions ([[army-list-json-shape]]) but I observed **numbers** in live army-book responses. Either the two endpoints genuinely differ, or the shape drifted since those types were written. **Both explanations are bad news for anyone assuming stability.**

Further signals that OPR is actively changing this surface:
- An `army-forge-beta.onepagerules.com` host exists with parallel endpoints — active development.
- "Introducing Army Forge Labs" (Dec 15, 2025) and "New Creators Tab" (Jan 2024) — the product is moving.
- `/api/army-books?gameSystem=2` silently returns `[]` without `filters=official` — undocumented parameter semantics that could shift.

## Mitigations (in rough priority order)

1. **Validate at the boundary.** Parse into a schema (zod/valibot); never trust field presence. On mismatch, fail loudly with an actionable message. A silent mis-import that corrupts a player's stats is far worse than a clean refusal.
2. **Isolate the fetch layer.** One module owns every Army Forge call. When the API moves, one file changes.
3. **Never block on the network.** Always offer paste-the-JSON as a fallback path — see [[army-forge-cors-blocks-direct-browser-calls]]. If the API vanishes tomorrow, the module still works.
4. **Cache politely.** Rule glossaries change rarely; do not refetch a 27 KB payload per import.
5. **Pin nothing to the beta host.** It exists to change.
6. **Ask OPR.** A relationship converts "undocumented API that might break" into "we'll tell you before it breaks" — the single highest-leverage mitigation. See [[opr-permission-claim-is-unverified]].

## Counter-evidence worth weighing

The endpoints in [[integration-opr-af-to-tts]] (maintained through May 2026) and [[integration-opr-card-generator]] (July 2026) are **identical**, despite being written years apart by unrelated developers. That is real evidence of *de facto* stability. The API has held its shape for a long time.

The risk is real but empirically modest. Design defensively; do not be paralysed.

---
tags: [foundry-vtt, system-development]
source: inference
confidence: unverified
---

# ObjectField as a Free-Form system.data Escape Hatch

**This note is inference, not read from docs or source. Treat as unverified and confirm before relying on it.**

The mechanism underpinning [[generic-type-with-a-ruleset-blob-workaround]]: a `TypeDataModel` schema containing a loosely-typed field that accepts arbitrary ruleset-shaped data.

```javascript
static defineSchema() {
  const fields = foundry.data.fields;
  return {
    ruleset: new fields.StringField({required: true}),   // which ruleset owns this
    data: new fields.ObjectField({required: false})       // free-form payload
  };
}
```

**What I believe but have not confirmed:**
- `foundry.data.fields.ObjectField` exists in v13/v14 and accepts arbitrary serializable objects without schema validation.
- It round-trips through the server without the contents being stripped.
- Nested contents are not sanitized — so ruleset HTML inside the blob would bypass the manifest's `htmlFields` protection, which is a genuine security consideration, not just an inconvenience.

**Confirmed context this sits in:** [[typedatamodel-defineschema-and-data-preparation|`defineSchema` is static]], so a schema cannot be assembled from data loaded later. That is *why* a free-form field is needed at all in the blob approach — the escape hatch exists to defer typing to runtime.

**To settle:** read `foundry.data.fields.ObjectField` in the v14 API docs, and read how CSB types its template payload (`src/module/documents/model/` in project 31995966). CSB necessarily solves exactly this problem, so its answer is authoritative for the pattern.

Related: [[generic-type-with-a-ruleset-blob-workaround]].

---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# TypeDataModel: defineSchema and Data Preparation

`foundry.abstract.TypeDataModel` is the base class for the contents of a document's `system` field. It is the modern replacement for `template.json` — see [[template-json-vs-datamodels]].

```javascript
class QuestModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.SchemaField({
        long: new fields.HTMLField({required: false, blank: true}),
        short: new fields.HTMLField({required: false, blank: true})
      }),
      img: new fields.FilePathField({required: false, categories: ["IMAGE"]}),
      steps: new fields.ArrayField(new fields.StringField({blank: true}))
    };
  }

  prepareDerivedData() {
    this.nSteps = this.steps.length;
  }
}
```

Key points:

- `static defineSchema()` returns an object of `foundry.data.fields.*` instances. The schema is **fixed at class-definition time**.
- `TypeDataModel` subclasses may override `prepareBaseData` and `prepareDerivedData`, which "execute before document-level preparation logic."
- Fields declared as `HTMLField` / `FilePathField` should be mirrored in the manifest's `htmlFields` / `filePathFields` for that subtype so the server sanitizes and extracts correctly.

**Constraint relevant to a ruleset-neutral system:** because `defineSchema` is static, a schema cannot be assembled from data loaded later (e.g. a template document read from the world DB at `ready`). A model *class* can be generated dynamically at `init` from information already available synchronously, but not from anything requiring a DB read. This pushes ruleset-neutral designs toward [[objectfield-as-a-freeform-system-data-escape-hatch]].

Registration: [[registering-a-typedatamodel-at-init]].

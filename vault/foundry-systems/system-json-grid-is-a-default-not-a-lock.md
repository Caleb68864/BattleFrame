---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/system-development/ , https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.SystemManifestData.html
confidence: confirmed
---

# system.json grid Is a Default, Not a Lock

The `grid` field in `system.json` sets the **default for newly created Scenes**. It does not fix the grid system-wide.

Official wording from the system development article: "This value configures the default value used when a new Scene is created, but can always be changed for each Scene independently."

Real current shape (four optional keys):

```json
"grid": {
  "type": 1,
  "distance": 10,
  "units": "ft",
  "diagonals": 0
}
```

Per `foundry.packages.types.SystemManifestData`:
```ts
grid?: {
    diagonals?: GridDiagonalRule;
    distance?: number;
    type?: GridType;
    units?: string;
}
```

Cross-confirmed against a real shipping system — [[custom-system-builder-is-the-key-precedent|Custom System Builder]]'s `system.json` carries exactly `{"distance": 2, "units": "m", "type": 1, "diagonals": 0}`.

**Grid type varies per Scene.** `grid` is a `SchemaField` on the Scene document itself (`foundry.documents.BaseScene#defineSchema()`). A system cannot force all scenes to one grid type — a user can always make a square scene in a gridless system.

For Battleframe: set `{"type": 0, "distance": 1, "units": "in"}` as the default and accept that it's advisory. See [[grid-types-and-diagonal-rules-constants]] and [[gridless-is-a-first-class-grid-class]].

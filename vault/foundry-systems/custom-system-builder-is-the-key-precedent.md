---
tags: [foundry-vtt, system-development]
source: https://gitlab.com/api/v4/projects/31995966/repository/files/system.json/raw?ref=develop
confidence: confirmed
---

# Custom System Builder Is the Key Precedent

The most sophisticated ruleset-neutral Foundry system in existence (`custom-system-builder`, MPL-2.0, GitLab project 31995966). It lets users build a whole game system with no code.

**And it does not use dynamic subtypes at all.**

Its `system.json` `documentTypes`, verbatim from the `develop` branch:

```json
"documentTypes": {
  "Actor": { "character": {}, "_template": {} },
  "Item": {
    "equippableItem": {},
    "_equippableItemTemplate": {},
    "subTemplate": {},
    "userInputTemplate": {},
    "activeEffectContainer": {}
  }
}
```

Seven types. Fixed. Forever. A user building "Raven" or "Liminal" in CSB gets **no new subtype** — their game is a `_template` Actor document interpreted at runtime by a `character` Actor.

The `init` registration is correspondingly flat:
```js
CONFIG.Actor.documentClass = CustomActor;
CONFIG.Actor.dataModels.character  = CharacterActorDataModel;
CONFIG.Actor.dataModels._template  = TemplateActorDataModel;
CONFIG.Item.dataModels.equippableItem = EquippableItemDataModel;
// ...five more, all static
CONFIG.Combat.documentClass    = CustomCombat;
CONFIG.Combatant.documentClass = CustomCombatant;
```

**Why this matters:** CSB is the strongest possible existence proof for [[generic-type-with-a-ruleset-blob-workaround]] — and simultaneously evidence that the smartest people working this problem *chose* it over subtypes. But note **CSB's requirement is harder than Battleframe's**: CSB must support types invented by *users at runtime*, which [[document-subtypes-must-be-declared-statically-in-the-manifest|subtypes structurally cannot do]]. Battleframe's rulesets are *authored packages with their own manifests*. That difference is decisive — see [[battleframe-architecture-implications]].

CSB targets **Foundry v14** (`{"minimum": "14", "verified": "14.364", "maximum": "14"}`) — see [[foundry-v14-is-current-as-of-july-2026]].

How games ship on top of it: [[csb-ships-rulesets-as-compendium-data-not-code]].

---
tags: [foundry-vtt, system-development]
source: https://raw.githubusercontent.com/pedrobaringo/raven-csb-en/main/module.json
confidence: confirmed
---

# CSB Ships Rulesets as Compendium Data, Not Code

How a game becomes a module in the [[custom-system-builder-is-the-key-precedent|Custom System Builder]] ecosystem. This is a complete, working, shipped answer to "how does a module contribute a ruleset to a system" — without subtypes.

From `raven-csb-en/module.json` (the game "Raven" as a CSB module):

```json
"relationships": {
  "systems": [{
    "id": "custom-system-builder",
    "type": "system",
    "compatibility": { "minimum": "5.1.0", "verified": "5.1.0" }
  }]
},
"packs": [{
  "name": "actortemplates",
  "label": "Actor_Templates",
  "path": "packs/actortemplates",
  "type": "Actor",
  "system": "custom-system-builder",
  "ownership": { "PLAYER": "OBSERVER", "ASSISTANT": "OWNER" }
}]
```

The whole ruleset is **a compendium pack of Actor documents**. Not a data model. Not a sheet class. Data.

Three mechanisms worth noting:
1. **`relationships.systems`** — declares the module only works with CSB. Foundry surfaces this to users. This is exactly what the [[module-subtypes-are-not-guaranteed-to-work-with-a-given-system|official guidance]] prescribes for system-bound modules.
2. **`packs[].system`** — a pack field binding a compendium to a specific system.
3. `esmodules` is still present (`modules/raven.js`) — so a template module *can* also ship code, but the ruleset itself is data.

**Trade-off made explicit:** CSB template modules require zero JS from the ruleset author, work with any CSB version in range, and survive the module being disabled ([[module-subtypes-vanish-when-the-module-is-disabled|unlike subtypes]]). The cost is that everything the ruleset can express must be expressible in CSB's template language — a closed vocabulary. Anything CSB's formula engine can't say, the ruleset can't do.

That ceiling is the central reason to consider [[modules-can-contribute-document-subtypes|the subtype path]] instead, where rulesets ship arbitrary code.

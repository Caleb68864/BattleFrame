---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/v13/variables/CONFIG.ui.html , https://gitlab.com/peginc/swade/-/raw/develop/src/swade.ts
confidence: confirmed
---

# Combat Tracker Is Replaceable via CONFIG.ui.combat

The sidebar Combat Tracker application is swappable. The exact key is **`CONFIG.ui.combat`**, typed `combat: typeof CombatTracker`.

```js
CONFIG.ui.combat = SwadeCombatTracker;
```

Confirmed in production — [[swade-card-based-initiative-precedent|SWADE]] does exactly this (`src/module/sidebar/SwadeCombatTracker.ts`).

Sibling `CONFIG.ui` keys: `actors`, `cards`, `chat`, `compendium`, `controls`, `hotbar`, `items`, `journal`, `macros`, `menu`, `nav`, `notifications`, `pause`, `players`, `playlists`, `scenes`, `settings`, `sidebar`, `tables`, `webrtc`.

**Why this matters for exotic turn order:** core's tracker assumes a flat list sorted by a number. Since [[turn-order-model-is-replaceable-but-storage-is-not|setupTurns must return a flat array]], any hierarchical presentation (squads containing models, activation pools, "units yet to activate" buckets) has to be **reconstructed in the tracker UI** from the flat array plus your own data. Replacing `CONFIG.ui.combat` is what makes that possible.

So the pattern for group activation is a pair:
1. `CONFIG.Combat.documentClass` — a Combat subclass that owns ordering logic.
2. `CONFIG.ui.combat` — a tracker subclass that owns presentation.

Related: [[combat-overridable-methods-reference]].

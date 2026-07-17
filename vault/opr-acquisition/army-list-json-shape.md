---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/thomascgray/opr-af-to-tts/blob/master/src/army-forge-types.ts
confidence: partial
---

# Army List JSON Shape — Community TypeScript Definitions

The shape returned by [[army-forge-api-tts-endpoint]]. **Marked `partial`: this is transcribed from a third party's reverse-engineered type definitions, not from a live response I observed.** I lacked a valid share-link ID. Validate against a real payload before building against it.

Source: `opr-af-to-tts`, `src/army-forge-types.ts` (163 lines) — written by a developer who consumed this API in production, so it is credible, but it is not a spec.

## Root

```ts
export interface ListState {
  creationTime: string;
  name: string;
  pointsLimit?: number;
  units: ISelectedUnit[];
  points: number;
  campaignMode?: boolean;
  competitive?: boolean;
  id?: string;
  key?: string;
  gameSystem: eGameSystemInitials;   // "gf" | "gff" | "aof" | "aofs" | "aofr"
}
```

## Unit

`ISelectedUnit` merges the book's `IUnit` with per-list selection data:

```ts
interface IUnit {
  id: string; armyId: string; sortId: number;
  name: string; category?: string;
  size: number; cost: number;
  quality: string; defense: string;      // NOTE: string here, but number in the army-book API
  rules?: ISpecialRule[];
  weapons: IUpgradeGains[];
  upgrades: string[];
  disabledUpgradeSections: string[];
}

interface IUnitSelectionData {
  selectionId: string;
  customName?: string;
  selectedUpgrades: { instanceId: string; upgrade: IUpgrade; option: IUpgradeOption }[];
  loadout: IUpgradeGains[];   // <-- the resolved, final equipment
  combined: boolean;
  joinToUnit?: string;
  xp: number;
  traits: string[];
  notes: string;
}
```

## The key insight: `loadout` is pre-resolved

`loadout` holds the unit's **final, post-upgrade equipment** — Army Forge has already applied every "replace X with Y" transformation. An importer consuming `/api/tts` does **not** need to re-implement OPR's upgrade-resolution engine, which is the single nastiest part of [[army-book-json-shape]].

**This is the decisive argument for building the importer against `/api/tts` (a user's own shared list) rather than against the army-book database.** It is simultaneously the easier engineering path and the defensible legal one. See [[import-own-list-vs-bulk-scrape]].

## Type discriminator

`IUpgradeGains.type` is one of:
`"ArmyBookRule" | "ArmyBookWeapon" | "ArmyBookItem" | "ArmyBookDefense"`

Weapons carry `attacks`, `range`, `specialRules[]`. Rules carry `rating`, `condition`, `modify`.

## Known rough edges (flagged by the author in-source)

```ts
id?: string;   // "the fact this can be undefined is from my testing"
key?: string;  // "and the fact this is here at all is the same"
```

Two fields the author found empirically and could not explain. Treat optionality as real.

Also note `quality`/`defense` are typed `string` here but I observed **numbers** (`"quality": 2`) in the army-book API. Coerce defensively.

Related: [[verdict-parsing-needs-no-llm]], [[army-forge-share-link-format]]

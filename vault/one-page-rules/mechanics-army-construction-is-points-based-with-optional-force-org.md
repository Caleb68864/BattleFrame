---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/6931c7468d84d8e09743fb25_GF%20-%20Beginner%27s%20Guide%20v3.5.1.pdf
confidence: confirmed
---

# Army Construction Is Equal Points With No Mandatory Composition Limits

GF Core Rules v3.5.1: *"The players put together two armies of **equal points** before the game begins (we recommend **1000pts to start, and 2000pts for a full match**)."*

**By default, composition is unconstrained.** Beginner's Guide v3.5.1:

> simply select units and upgrades from **one or more armies of your choice**, and sum together their total point cost. There are **no limitations** as to how many units you can take, as long as their point cost doesn't go over the agreed total game size.

Note *"one or more armies"* — **mixing factions ("soup") is legal by default.** There is no mandatory force organisation, no troop tax, no HQ requirement.

This is why **unit counts are naturally unequal** between players — the direct cause of [[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]].

## Force Organisation — OPTIONAL

> Players may only bring up to **1 hero per 500pts**, and only **1+X copies of the same unit, where X is 1 per 1000pts** (combined units count as one). No single unit may be worth over **35%** of total points, and armies may only have max. **1 unit per 200pts**.

Worked example: *"When playing a 2000pts game, players may bring max. 4 heroes, max. 3 copies of each unit, no unit worth over 700pts, and max. 10 units in total."*

The API exposes this as first-class state — `"forceOrg": true`, `"forceOrgErrors": [...]`, `"pointsLimit"` ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]) — so **Army Forge already validates it**. BattleFrame should **not** reimplement list validation; import and trust, surfacing `forceOrgErrors` as warnings. Note `"1 unit per 200pts"` also **bounds activation count**, which bears on the uneven-activation ruling.

Force Org **did not exist in v2.16** ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).

## Combined Units

> Players may combine **two copies of the same multi-model unit** into a single unit, **if upgrades that apply to all models are bought for both**.

Exactly **two**, never three. Both copies must share all-model upgrades — *"A unit of Dynasty Warriors with Rifles cannot be merged with a unit of Dynasty Warriors with Shotguns."* Single-model heroes can't combine. Surfaces in the API as `"combined": true/false`.

Combining **trades activations for resilience**: one bigger unit is one activation instead of two, and its half-strength morale threshold ([[mechanics-morale-has-two-distinct-triggers]]) is computed on the doubled starting size.

## Heroes

> Heroes with up to **Tough(6)** may deploy as part of one multi-model unit **without another Hero**. The hero may take morale tests on behalf of the unit, but must use the unit's Defense until all other models have been killed.

API: `"joinToUnit"`. Wound allocation puts heroes **last** ([[mechanics-tough-changes-wound-allocation]]).

## Points scale across the family

GF 1000/2000 · AoF 750/1500 · Firefight 200/300 · AoF Skirmish 150/250 · AoF Regiments 750/1500 · Warfleets 300/450.

**Not in the core rules:** per-unit rosters, sizes, costs and upgrade trees — those live in army books / Army Forge ([[licence-army-books-and-unit-stats-share-the-core-rules-status]]).

**Confidence: confirmed** — quoted from GF Core Rules and Beginner's Guide v3.5.1.

# Simple Skirmish — rule coverage ledger

Every piece of the *Simple Fantasy Skirmish* quick reference (Peter Vodden, CC BY-NC 4.0),
mapped to where it is implemented, or to an explicit, honest deferral. ✅ = implemented and
tested; 🟡 = mechanical primitive implemented, table/UI choice deferred; ⏳ = deferred (Advanced
Game or needs a collision/UI layer this MVP does not build). Nothing is silently missing.

## Order of Play
| Rule | Status | Where |
|---|---|---|
| Roll to pick table end / deploy within 12" | ⏳ | Deployment is GM table setup; no code needed |
| Round: clear markers, roll Initiative, highest chooses first | ✅ | `round/session.ts` `determineFirstPlayer`, `createSkirmishRound` |
| Turn: pick a unit → move → attack → mark activated | ✅ | `round/session.ts` `activate` (move/attack are the acts within it) |
| Players alternate until all units activated, then new round | ✅ | `round/session.ts` continuous alternation + `isComplete` |
| Skill actions any time except during Attack | ⏳ | Skill is Advanced Game (schema field carried) |

## Rule of Halves
| If half a unit can/​is, the whole unit can/​is | ⏳ | Advanced resolution convenience; single-token-per-unit MVP makes it moot |

## Moving & Measuring
| Rule | Status | Where |
|---|---|---|
| Movement = centre to centre | ✅ | core `measure.between(..., "centre-to-centre")` (this ruleset's engine addition) |
| Range / Charge-In = centre to nearest enemy model | 🟡 | `combat/range.ts` `nearestEnemy` (nearest enemy **unit** centre; per-model spread is the deferred formation layer) |
| Line-of-sight = centre to centre | ✅ | core centre-to-centre |
| Move speeds 3/6/9 | ✅ | `constants.ts`, `round/movement.ts` `moveSpeedInches` |
| Terrain / vertical at half-speed | ✅ | `round/movement.ts` `effectiveMoveInches` (stacking flagged for the full rules) |
| Skirmish formation (≤1 base-width apart) | ⏳ | No collision/formation engine; GM positions, engine measures — same as GREATHELM movement |
| After 1st melee contact, free base-width move | ⏳ | Positioning aid; GM applies |
| Leeway marker (1 base-width measuring margin) | ⏳ | A measuring-dispute convention; no engine artefact |

## Stats on Unit Card
| Attack / Save / Skill / Move / model count | ✅ | `data/unit.ts` (nullable d6 targets; null = cannot) |

## Resolving Battle
| Rule | Status | Where |
|---|---|---|
| Roll 1 die per model; ≥ Attack = hit | ✅ | `combat/resolve.ts` `countHits`, `resolveAttack` |
| Defender rolls 1 per hit; < Save = casualty; no Save = all hit | ✅ | `combat/resolve.ts` `countUnsaved`, `resolveAttack` |
| Apply casualties; unit at 0 models destroyed | ✅ | `data/unit-state.ts` `applyCasualties`, `isUnitDestroyed` |
| Read stats, resolve, apply — one attack | ✅ | `combat/attack.ts` `performAttack` |

## Advantage Points
| Rule | Status | Where |
|---|---|---|
| Cover / height / obstacle sources grant points | ⏳ | Situational, GM-adjudicated inputs |
| Both sides' points cancel; net remains | ✅ | `combat/advantage.ts` `netAdvantage` |
| Each net point alters one die by one | 🟡 | `combat/advantage.ts` `alterDie` (which die is the player's choice) |

## Champions
| Rule | Status | Where |
|---|---|---|
| Wield magical items rolled on d8/d10/d12 | ✅ | `combat/champion.ts` `championDieSize`; `resolveAttack` `dieSize` |
| Attach/detach, casualties from unit first, re-roll own save | ⏳ | Advanced-Game orchestration |

## Ending the Game
| Basic Game deathmatch: first to no models loses | ✅ | `round/victory.ts` `checkVictory` (both-wiped = honest draw) |
| Advanced designed scenarios / victory conditions | ⏳ | Advanced Game |

## Foundry integration
| Piece | Status | Where |
|---|---|---|
| Unit Actor subtype + data model | ✅ | `data/unit.ts` |
| Unit sheet | ✅ | `sheets/unit-sheet.ts`, `templates/unit-sheet.hbs` |
| Ruleset registration (fail-loud, load-order-independent) | ✅ | `main.ts` |
| i18n completeness guard | ✅ | `tests/i18n.test.ts` |
| An in-canvas "run the round" scene control | ⏳ | The clickable activation UI is the next build step; the round *logic* is complete and driven end-to-end by `tests/round-integration.test.ts` |

## Summary

The **Basic Game** is implemented and tested end to end: deploy (GM) → initiative → alternating
activation → move/attack → hits/saves/casualties → destruction → deathmatch victory. What
remains is the **Advanced Game** (skills, full advantage/champion orchestration, scenarios) and
the **in-canvas activation control** (the round plays in tests; wiring a scene-control button is
the next Foundry-UI step). Everything deferred is deferred *on purpose and named here* — none of
it is silently absent.

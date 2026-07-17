---
tags: [wargame-research, battletech]
source: https://raw.githubusercontent.com/MegaMek/mm-data/master/data/mekfiles/vehicles/3039u/AC2%20Carrier.blk
confidence: confirmed
---

# The .blk Format — MegaMek's Non-'Mech Unit File

`.blk` is MegaMek's format for **everything that isn't a BattleMech**: vehicles, battle armor, infantry, ProtoMechs, aerospace fighters, DropShips, JumpShips, WarShips, small craft, space stations, handheld weapons.

Described from an **actual file** (`AC2 Carrier.blk`), not from memory.

## Structure: XML-like `<tag>` blocks, value on its own line

Unlike [[megamek-mtf-unit-format]]'s `key:value` lines, `.blk` uses angle-bracket tags with the value on the following line(s):

```
#Saved from version 0.51.01 on 2026-07-12
<UUID>
019f583e-e242-7bc1-a349-43383dea7e36
</UUID>

<UnitType>
Tank
</UnitType>

<Name>
AC/2 Carrier
</Name>

<Model>

</Model>

<mul id:>
5
</mul id:>

<year>
2520
</year>

<type>
IS Level 1
</type>

<role>
Sniper
</role>

<motion_type>
Tracked
</motion_type>

<cruiseMP>
3
</cruiseMP>

<engine_type>
1
</engine_type>
```

Note `<mul id:>` — the colon is *inside* the tag name. It is **not** well-formed XML and will not parse with a standard XML parser; it needs a bespoke reader.

## Key observations

- `<UnitType>` discriminates the unit class (Tank, Infantry, BattleArmor, …), which determines the rest of the schema — the format is polymorphic.
- Vehicles use `cruiseMP`/`flankMP` where 'Mechs use `walk mp`/`run`.
- Same `mul id:` cross-reference to [[master-unit-list-api]].
- **Carries the identical CC BY-NC-SA 4.0 + Topps/Catalyst/Microsoft header** as `.mtf` — see [[megamek-data-license-cc-by-nc-sa]].

## Practical note

Two formats + a polymorphic schema + non-standard XML means "just import MegaMek data" is a **real parser project**, not a weekend script — before any licensing question is even reached.

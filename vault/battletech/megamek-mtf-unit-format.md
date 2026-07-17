---
tags: [wargame-research, battletech]
source: https://raw.githubusercontent.com/MegaMek/mm-data/master/data/mekfiles/meks/3025%20CCE/Assault/Atlas%20AS7-A.mtf
confidence: confirmed
---

# The .mtf Format — MegaMek's BattleMech Unit File (real sample read)

**Answer to "does MegaMek have machine-readable unit data files?" — YES.** `.mtf` for 'Mechs, `.blk` for everything else ([[megamek-blk-unit-format]]).

Format described from an **actual file** (`Atlas AS7-A.mtf`), not from memory.

## Structure: line-oriented `key:value` + named block sections

```
uuid:019f583e-c117-7066-9ed5-dabc28c61c81
generator:MegaMek Suite 0.51.01 on 2026-07-12
chassis:Atlas
model:AS7-A
mul id:7433

Config:Biped
techbase:Inner Sphere
era:2954
source:TR:3025C,TR:SW
rules level:1
role:Juggernaut

quirk:battle_fists_la
quirk:command_mech

mass:100
engine:300 Fusion Engine
structure:IS Standard
myomer:Standard

heat sinks:20 Single
walk mp:3
jump mp:0

armor:Standard(Inner Sphere)
LA armor:34
RA armor:34
CT armor:47
HD armor:9
RTC armor:14      # RT* = rear torso armor

Weapons:9
Medium Laser, Left Arm
SRM 6, Left Torso
AC/5, Right Torso
```

Then **one block per hit location**, listing all 12 critical slots in order:

```
Left Torso:
Heat Sink
SRM 6
SRM 6
IS Ammo LRM-10
-Empty-
...
```

Then HTML-bearing fluff fields: `overview:`, `capabilities:`, `deployment:`, `history:`, `manufacturer:`, `primaryfactory:`, and `systemmanufacturer:CHASSIS:Foundation` style component attribution.

## Why this is architecturally significant

The format encodes **exactly** the Classic BattleTech simulation model:
- per-location armor **and** rear armor
- **critical slot layout** (which component is in which of 12 slots — drives crit hits)
- heat sink count and type
- per-weapon location assignment

This is a full Classic BattleTech unit, not a summary. It is the data an engine needs for [[classic-battletech-mechanics]] — and it's why Classic is so far from a paper-sized skirmish game.

## Two high-value details

1. **`mul id:7433`** — every file cross-references its [[master-unit-list-api]] ID. The two datasets are joinable.
2. **The licence header is embedded in every single file** — you cannot take the data without taking the notice. See [[megamek-data-license-cc-by-nc-sa]].

## Coverage

`mm-data/data/mekfiles/` holds `meks/` (59 era/source folders → weight-class subfolders), plus `vehicles/`, `battlearmor/`, `infantry/`, `protomeks/`, `fighters/`, `dropships/`, `jumpships/`, `warship/`, `smallcraft/`, `spacestation/`, `handheld/`. Thousands of units. It is the most complete open BattleTech dataset in existence.

**⚠️ Note the .mtf format carries NO Alpha Strike stats** — it's a Classic unit definition. AS values come from the MUL ([[master-unit-list-api]]) or are computed by conversion.

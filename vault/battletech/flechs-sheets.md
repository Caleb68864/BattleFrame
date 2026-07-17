---
tags: [wargame-research, battletech]
source: https://flechs.net/
confidence: confirmed
---

# Flechs Sheets — Correctly Identifying the User's "FlexSheets"

**The user said "FlexSheets." They meant [Flechs](https://flechs.net/) — specifically Flechs Sheets at `sheets.flechs.net`.** Confirmed: it is the popular free browser-based BattleTech record-sheet tool. ("Flechs" ≈ "flesh"/"flex" phonetically — a natural dictation slip.)

## What Flechs actually is

Flechs is a **suite**, broader than just record sheets. From flechs.net:

- **Flechs Sheets** — "a browser-based, networked, record-sheet playing aid designed for tablets"; automates rule resolution and record-keeping
- **Initiative tracker** for multi-team combat
- **Line of sight visualization** tool
- **Hit location table trainer**
- **Dice roller** ("D.A.D.B.O.D.")
- **Chaos Campaign force management helper**
- **Movement path visualization**

Sarna describes Flechs Sheets as an **unofficial** record-sheet aid.

## Distribution

Web (`sheets.flechs.net`), **Google Play** (`alpha.sheets.flechs.net`), and itch.io. Funded via **Ko-fi** (donations) — notably *not* ads or subscriptions, which keeps it on the right side of both the CC-BY-NC NonCommercial line and Microsoft's GCUR donation carve-out. That may well be deliberate.

## Open source? API?

**Not found.** No public source repository, no licence statement, no API documentation, and no author attribution located on the site, its changelog, or Sarna. Sarna's Flechs Sheets article is flagged as an orphan/incomplete.

The site is a JavaScript SPA, so fetching it returns only a `LOADING...` shell — I could not read its legal notices, if any exist. **I did not find any copyright or attribution notice on Flechs.**

## Import/export (confirmed from its changelog)

- Imports **MegaMek `.mtf`** files (custom designs)
- Imports **`.mul`** files (force lists)
- Imports **SSW** (Solaris Skunk Werks) files
- Exports "to paper" (print sheets)

Its data source is the interesting part → [[flechs-data-source-is-megamek]].

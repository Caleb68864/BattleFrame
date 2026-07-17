---
tags: [wargame-research, battletech]
source: https://github.com/MegaMek/megamek/blob/master/LICENSE
confidence: confirmed
---

# MegaMek CODE Is GPLv3 (user's guess verified — but recently changed)

**The user believed MegaMek is GPL. Confirmed — with a version nuance they'd want to know.**

Read directly from `LICENSE` in the MegaMek repo:

> All source code in the MegaMek, MegaMekLab, and MekHQ repositories is licensed under GPLv3.

`LICENSE.code` is the verbatim GNU GPL v3 text.

**Applies to:** all `.java` files, build scripts, configuration files, "any other program code."
**Directory:** `/megamek/src/megamek` → GPLv3.

## Recent licence change (important)

> Prior to version **0.50.07**, MegaMek and MegaMekLab were licensed under GNU General Public License **v2.0 or later (GPLv2+)**. MekHQ was already using GPLv3. The transition to the current licensing structure was implemented with the release of version 0.50.07.

So any older fork/snapshot may carry different terms.

## Consequence for a Foundry VTT engine

GPLv3 is **strong copyleft**. Reusing MegaMek's *code* — even translated logic, arguably — would push the derived work toward GPLv3. Foundry modules are typically MIT/proprietary; a GPLv3 obligation is a significant architectural and commercial constraint.

**Practical read:** MegaMek's code is best used as a *reference implementation to read*, not a codebase to copy. The far more valuable asset is the data — but the data is under a **different and more restrictive** licence. That split is the whole story: [[megamek-data-license-cc-by-nc-sa]].

Related: [[megamek-what-it-is]]

---
tags: [wargame-research, battletech]
source: inference
confidence: partial
---

# Licensing Verdict — No Shippable BattleTech Content Exists

**The consolidated answer to "can a Foundry module ship BattleTech content?"**

## Verdict: NO — and no source examined changes that

Every candidate data source, and why each fails:

| Source | Licence | Verdict |
|---|---|---|
| Alpha Strike Quick Start PDF | © Catalyst, free-to-download, **no reuse grant** | ❌ [[free-to-read-vs-free-to-ship]] |
| Free record sheets / AS box cards | © Catalyst, same | ❌ |
| **Master Unit List** (JSON API) | **Topps IP, "Under License from" Topps**, no ToS, no export | ❌ [[master-unit-list-is-officially-licensed]] |
| **MegaMek data** (`.mtf`/`.blk`) | CC-BY-NC-SA-4.0 — *asserted by fans who don't own the IP* | ❌ [[megamek-data-license-cc-by-nc-sa]] |
| MegaMek code | GPLv3 — real, but strong copyleft | ⚠️ [[megamek-code-license-gpl3]] |
| Flechs | Downstream of MegaMek data | ❌ [[flechs-data-source-is-megamek]] |
| Any BattleTech SRD | **Does not exist** | ❌ |
| Catalyst fan-content licence | **Does not exist** — searched, not found | ❌ [[catalyst-fan-content-policy-not-found]] |

## The three independent blockers

1. **No grant.** There is no SRD, no OGL, no CC licence, no fan-content policy from Catalyst/Topps. Default is **no permission**. ([[catalyst-fan-content-policy-not-found]])
2. **The fan CC licence is likely void as to the stats.** CC BY-NC-SA grants only rights "the Licensor has authority to license." MegaMek concedes it is unlicensed by Topps/Catalyst/Microsoft. **You cannot launder Topps IP through a volunteer project's CC notice.** Even flawless BY-NC-SA compliance leaves you exposed to Topps.
3. **A VTT module is an *electronic game*.** Microsoft — not Catalyst — holds "the BattleTech name for electronic games" ([[topps-owns-battletech-ip]]). MegaMek's GCUR reliance is **their interpretation**; BattleTech isn't listed in the GCUR text, and the GCUR is non-commercial and **revocable at any time for any reason** ([[microsoft-game-content-usage-rules]]).

And this estate **litigates** — [[unseen-harmony-gold-litigation]].

## What IS defensible (my structural read, not legal advice)

**Game mechanics are not copyrightable in the US — only their expression is.** This is how MegaMek has survived 20+ years and Flechs runs publicly today.

A plausible-looking posture:
- ✅ Ship a **rules engine** — mechanics implemented from independent understanding
- ✅ Ship **zero** Catalyst text, tables, art, unit names, or stat blocks
- ✅ **Link** users to Catalyst's free QSR
- ✅ Let **users** import their own data (the Flechs pattern: the *user* supplies the `.mtf`)
- ❌ Never bundle a unit database
- ❌ Never ship 'Mech artwork (**sharpest hazard** — [[unseen-harmony-gold-litigation]])
- ❌ Never charge for anything touching this

**"BYO-data"** — engine ships empty, user imports — is the single most defensible architecture, and it's what the surviving tools actually do.

## ⚠️ Required: human legal review

**I am not giving a confident green light, and this note must not be read as one.**

Genuinely unresolved, and needing a lawyer:
- Does the GCUR cover **BattleTech tabletop unit stats**? (Not stated by Microsoft.)
- Are AS stat lines "uncopyrightable facts/mechanics" or "copyrightable expression/compilation"? **Stat blocks sit right on this line.** A database of thousands may attract compilation copyright independent of any single stat.
- Does trademark (Topps 'Mech names; Microsoft's electronic-games mark) bar even a no-data engine that *says* "BattleTech"? Nominative fair use is likely but fact-specific.
- Does MegaMek/Flechs' survival reflect a legal right or **mere tolerance**? **Tolerance is not a licence** and can end without warning.

**Bottom line:** the *mechanics* are researchable and probably implementable; the *content* is not shippable. Treat every dataset here as read-only research material until a lawyer says otherwise.

---
tags: [wargame-research, battletech]
source: https://www.xbox.com/en-US/developers/rules
confidence: partial
---

# Microsoft's Game Content Usage Rules — MegaMek Leans On Them, But BattleTech Isn't Listed

Every MegaMek unit data file and MegaMek's `LICENSE` assert that the data was created under Microsoft's Game Content Usage Rules (GCUR). Verbatim, from the header of a real `.mtf` file:

> MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under
> Microsoft's "Game Content Usage Rules"
> <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or
> affiliated with Microsoft.

This matters because Microsoft holds **the BattleTech name for electronic games** ([[topps-owns-battletech-ip]]) — and a Foundry VTT module is an electronic game.

## What the GCUR actually says (fetched)

> These Rules apply to all games and Game Content **published and owned by Microsoft Studios**

> we can't give you permission to use games from other publishers

> you can't sell or otherwise earn any compensation from your Item, including through advertisements

> **We can revoke this limited-use license at any time and for any reason without liability to you.**

Narrow exceptions: YouTube/Twitch ad revenue, optional donations, sanctioned contests.

## ⚠️ The gap — flagging this honestly

**BattleTech and MechWarrior are NOT enumerated in the GCUR page I fetched.** The GCUR covers titles "published and owned by Microsoft Studios."

So MegaMek's reliance on the GCUR is **MegaMek's own legal interpretation**, not a documented Microsoft grant naming BattleTech. It may well be sound — Microsoft does own the MechWarrior electronic-game line, and the *Wolves* fan project cites the GCUR for MechAssault. But I could not confirm from Microsoft's own text that GCUR extends to BattleTech tabletop unit statistics.

Two further problems even if it *does* apply:
1. **Non-commercial.** GCUR forbids compensation including ads. A paid or ad-supported module is out.
2. **Revocable at any time, for any reason.** Not a foundation to build a product on.

**Confidence: partial.** The quotes are confirmed; whether GCUR covers BattleTech is **unverified** and is exactly the kind of question that needs **human legal review**.

Related: [[megamek-data-license-cc-by-nc-sa]], [[licensing-verdict-battletech]]

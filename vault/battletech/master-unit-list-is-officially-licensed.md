---
tags: [wargame-research, battletech]
source: https://masterunitlist.azurewebsites.net/Home/GettingStarted
confidence: confirmed
---

# The MUL Is Officially Licensed by Topps — Which Makes It Off-Limits, Not Open

The Master Unit List describes itself:

> The online Master Unit List (MUL) is a tool for players to quickly and easily sort through the thousands of units that populate the *BattleTech* game/universe when creating a force for a game, a campaign, and so on.

It carries **Catalyst Game Labs branding** and this footer, read directly:

> © 2026 - 2001-2010 The Topps Company, Inc.
> Mechwarrior, BattleMech, 'Mech and Aerotech are registered trademarks of The Topps Company, Inc.
> **Under License from** [The Topps Company]

## The counter-intuitive conclusion

It's tempting to read "official database with a working JSON API" ([[master-unit-list-api]]) as the *safest* source. **It is the opposite.**

| Source | Status |
|---|---|
| MegaMek data | Unlicensed fan work, CC-BY-NC-SA asserted by fans — [[megamek-data-license-cc-by-nc-sa]] |
| **MUL data** | **Topps IP, served under an express Topps licence** |

MUL data is the **most clearly and directly owned** BattleTech data on the internet. It is published under a licence granted *to Catalyst, for Catalyst's use* — a licence that conspicuously does not extend to third parties.

Scraping it into a shippable Foundry module means copying a licensed rights-holder's database wholesale. There is:
- **no terms-of-use page found** granting any reuse
- **no export feature**
- **no API documentation** — i.e. no public API contract at all

## Verdict

The MUL is **excellent for research and for a human looking up a unit**. It is **not** a content source a module can ship from. Its very officialness is what makes it dangerous.

See [[licensing-verdict-battletech]].

---
tags: [wargame-research, battletech]
source: https://github.com/MegaMek/megamek/blob/master/LICENSE.assets
confidence: confirmed
---

# MegaMek DATA Is CC-BY-NC-SA-4.0, NOT GPL — The Split That Kills the Shortcut

**The task asked whether the DATA licence differs from the CODE licence. It does. This is the single most important finding in the BattleTech research.**

MegaMek uses an explicit dual-licence:

> MegaMek uses a dual-licensing approach:
> 1. **GNU General Public License v3.0 (GPLv3)** for all code
> 2. **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)** for all game data and assets

I read `LICENSE.assets` directly — it is the verbatim **CC BY-NC-SA 4.0** legal text. The separate `mm-data` repo's `LICENSE` is **also** verbatim CC BY-NC-SA 4.0. Every `.mtf`/`.blk` file carries the header inline:

> `# MegaMek Data (C) 2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.`

**Applies to:** unit data files, artwork, sounds, scenario data, game text/descriptions.

## ⚠️ Documentation inconsistency worth knowing

MegaMek's `LICENSE` overview says **CC-BY-NC-SA-4.0** at the top, but its "Data/Assets License Details" section says **CC-BY-NC-4.0** (no ShareAlike) and even claims "You can license your derivatives under different terms as long as they remain non-commercial" — which contradicts ShareAlike. The **actual licence files are BY-NC-SA**. Treat ShareAlike as binding; the prose is stale.

## The three blockers for a Foundry module

1. **NonCommercial** — "not primarily intended for or directed towards commercial advantage or monetary compensation." A paid module, or ad/subscription-supported service, is out.
2. **ShareAlike** — derivatives must be BY-NC-SA (or compatible). This is **incompatible with GPLv3** and with MIT/typical Foundry licensing. It would virally constrain the module's data layer.
3. **Nemo dat** — see below. This is the real problem.

## MegaMek explicitly forecloses the obvious use case

Their `LICENSE` addresses this directly and unusually clearly:

> A website that hosts our unit stats with ads or premium subscriptions is not allowed.
> What's not permitted are monetized websites, apps, or services built primarily on MegaMek game data - things like **commercial army builders, paid reference apps, or subscription-based unit databases**.

A Foundry module shipping MegaMek unit stats is close to "app built primarily on MegaMek game data."

(They *do* explicitly permit monetized streams/videos about MegaMek — irrelevant here.)

## The deeper problem: MegaMek may not have the right to license this at all

CC BY-NC-SA grants only rights "**that the Licensor has authority to license**" (Section 2(a)(1)). MegaMek is a volunteer fan project that concedes it is:

> an unofficial, fan-created digital adaptation and is not affiliated with, endorsed by, or licensed by Microsoft Corporation, The Topps Company, Inc., or Catalyst Game Labs.

The unit stats are **derived from Catalyst/Topps publications**. MegaMek cannot sublicense IP it does not own. So their CC grant is, at best, effective only over whatever thin rights they hold in their *compilation/encoding* — **not** over the underlying BattleTech stats.

**Answer to "Is MegaMek's data legally usable in a separate project?"**
**No — not safely, and not on the strength of the CC licence alone.** Even perfect BY-NC-SA compliance leaves the Topps/Catalyst layer untouched. This requires **human legal review**; I will not give a confident green light.

Related: [[megamek-mtf-unit-format]], [[microsoft-game-content-usage-rules]], [[licensing-verdict-battletech]]

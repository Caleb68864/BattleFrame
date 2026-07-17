---
tags: [wargame-research, candidate-ruleset]
source: https://morkborg.com/license/
confidence: confirmed
---

# The Mörk Borg Third Party License

The most useful licensing instrument found in this survey — because of one clause: **"The mechanics and game rules of MÖRK BORG may be reused and referenced freely."**

## Full terms (fetched live from https://morkborg.com/license/)

> "This license allows anyone to make stuff for MÖRK BORG and either publish it for free or sell it, without us taking a cut. Adventures, hacks, modules, anything goes. Just a few basic rules:"

**Content:**
1. "If you adhere to these terms you are allowed to publish free or commercial material based upon and/or declaring compatibility with MÖRK BORG without express permission from either Ockult Örtmästare Games, Stockholm Kartell or Fria Ligan AB."
2. "Art and text from our books may not be reused or translated, unless you have our explicit permission. This does not include the Prophecy (MÖRK BORG page 17)—which you may recite in its entirety. You can also use the names of creatures, locations and entities of the game world."
3. **"The mechanics and game rules of MÖRK BORG may be reused and referenced freely."**

**Branding:** may not use Stockholm Kartell / Ockult Örtmästare / Free League / Black Metal or regular MÖRK BORG logos without permission (4); *encouraged* to use the compatibility logo (5); may not imply endorsement (6).

**Legal:** no liability for third-party products (7); Swedish law governs (8). Required text (9):

> "[Product name] is an independent production by [Author or Publisher] and is not affiliated with Ockult Örtmästare Games or Stockholm Kartell. It is published under the MÖRK BORG Third Party License."

Plus required notice (10): "MÖRK BORG is copyright Ockult Örtmästare Games and Stockholm Kartell." Also: a tone clause ("Make it dark, depressing, weird and cruel... avoid sexist, racist, homophobic and transphobic tropes"), and an explicit NFT ban.

## What it is and isn't

**It is not CC or OGL.** Be precise about this:

| | Permitted |
|---|---|
| **Reuse rules & mechanics** | ✅ Freely |
| **Reuse creature/location/entity names** | ✅ |
| **Publish commercially, no royalty** | ✅ No cut taken, no approval needed |
| **Reuse the books' art and prose text** | ❌ Not without explicit permission |
| **Use the logos** | ❌ (except the compatibility logo) |

So it's a **royalty-free compatibility + mechanics-reuse license**, not an open-content license. The distinction from [[free-as-in-beer-vs-openly-licensed]] is real but the practical effect for *software* is unusually favourable.

> [!tip] Why clause 3 is the whole ballgame for a rules engine
> A Foundry module's job is to **implement mechanics**, not to reproduce prose. Clause 3 grants exactly the thing a rules engine needs, with **no approval process and no royalty**. The clause 2 art/text restriction bites much less than it would for a PDF publisher — we don't want to ship their prose anyway.
>
> Caveat needing human review: **stat blocks sit on the line.** A creature's numbers are arguably "mechanics" (clause 3, permitted) but a stat block as written is arguably "text from our books" (clause 2, forbidden). Re-expressing mechanics in your own data format is the safer posture. Get this answered before shipping.

## Why it matters beyond Mörk Borg

This license (and Mausritter's near-identical one, see [[mausritter-srd]]) represents a **third category** the original brief's binary missed: not free-as-in-beer, not CC/OGL, but a **bespoke third-party compatibility license** that is genuinely permissive for mechanics. Several indie designers have adopted this shape. It is worth searching for explicitly.

Games reachable through it: [[forbidden-psalm]], and the broader Mörk Borg third-party ecosystem.

## Related

- [[forbidden-psalm]]
- [[mausritter-srd]]
- [[free-as-in-beer-vs-openly-licensed]]
- [[licensing-freedom-ranking]]
- [[the-open-license-desert-in-miniatures-wargaming]]

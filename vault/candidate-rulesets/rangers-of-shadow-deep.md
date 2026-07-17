---
tags: [wargame-research, candidate-ruleset]
source: https://www.wargamevault.com/en/product/298580/Rangers-of-Shadow-Deep--PDF
confidence: confirmed
---

# Rangers of Shadow Deep

Solo/co-op fantasy skirmish with scripted enemy AI. Commercial, all-rights-reserved — but its **AI-driven activation** is the most engine-relevant thing in this survey.

## Identity

- **Author:** Joseph A. McCullough (same designer as [[frostgrave]])
- **Publisher:** Self-published 2018 via DriveThruRPG; Deluxe Edition distributed by Modiphius
- **URL:** https://modiphius.net/en-us/products/rangers-of-shadow-deep-deluxe-edition-pdf

## Licensing — commercial, all rights reserved

**Confirmed. Cannot ship content.** The rulebook copyright page reads:

> "Rangers of Shadow Deep is copyright Joseph A. McCullough, except for the illustrations which are copyright Barrett Stanley... No part of the book may be reproduced or transmitted in any form or by any electronic or mechanical means, including photocopying, recording or by any information storage and retrieval system, without the express written permission of the author and publisher, except where specifically permitted by law."

The only permission extended to buyers is narrow and personal:

> "The author and publisher give permission for the purchaser of this PDF to print out one copy for personal use."

No CC/OGL/ORC. No free full rulebook. PDFs circulating on pdfcoffee/scribd are **third-party mirrors, not official free releases** — their existence is not a license and they should not be treated as a source of shippable content.

## Activation model — phases plus deterministic enemy AI

**Confirmed** (via [tabletopstories.net review](https://tabletopstories.net/language/en/2019/12/rangers-of-shadow-deep-review-first-adventure/), [crittersmasher](https://crittersmasher.wordpress.com/2018/11/05/rangers-of-shadow-deep-about-the-game/)).

Four phases per turn: **Ranger → Creature → Companion → Event**.

- **Ranger phase:** each Ranger gets 2 actions (1 move + 1 other). Up to 2 additional figures within 3" can be group-activated. In solo play one Ranger activates 2 companions — 3 models total.
- **Creature phase:** enemies run a **simple deterministic AI**: ranged creatures hold and shoot the nearest target; melee creatures move toward the nearest/lowest-health target; with no LOS, they move to a scenario point or move randomly.
- **Companion phase:** remaining companions.
- **Event phase:** draw a playing card, resolve against a scenario-specific event table.

> [!tip] Why this matters architecturally
> The **enemy AI is a rules-defined, deterministic algorithm** — exactly the sort of thing a VTT can automate completely and correctly, with no opposing player to adjudicate. A solo game where the engine *is* the opponent is a genuinely different demand on the architecture than a PvP alternating-activation game. Worth designing for even if this specific title never ships. See [[solo-and-ai-driven-activation-as-an-engine-requirement]].

## Complexity

Medium-low. Built for solo/co-op; simplified AI replaces a second player. Generally considered more accessible than Frostgrave (reviewer consensus, not a quoted source — *partial*).

## Suitability

**Blocked on licensing; high value as a design input.** If a solo mode is ever a goal, this is the reference implementation to study.

## Related

- [[solo-and-ai-driven-activation-as-an-engine-requirement]]
- [[activation-model-comparison]]
- [[licensing-freedom-ranking]]

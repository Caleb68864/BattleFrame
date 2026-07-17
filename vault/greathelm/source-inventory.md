---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Source Inventory

## Primary

| Source | Locator | Value |
|---|---|---|
| **QSR v0.4 PDF** | `GREATHELM-QSR.pdf` (this folder) | **Authoritative.** Full quickstart ruleset, 5pp. Obtained from itch.io free NYOP download. Covers initiative, actions, movement, clash, damage, momentum, courage, victory. |
| **itch.io page** | https://malev-da-shinobi.itch.io/great-helm-pt | Only source defining [[scenes]]. |
| **Kickstarter** | https://www.kickstarter.com/projects/1674560143/greathelm | Designer's own rules prose. 403s to automated fetch; renders in a browser. Confirms dice-pool minimum, initiative choice, step arc. |

## Secondary

| Source | Locator | Value |
|---|---|---|
| **Goonhammer review** (Bair, Sep 23 2025) | https://www.tabletopbattles.com/goonhammer-reviews-greathelm-a-micro-skirmish-game-of-chivalric-fantasy/ | Detailed play report on a **pre-release** copy. Only source on light armour, bows/crossbows, items. Note: goonhammer.com redirects here. |
| **that70sgame** | https://that70sgame.wordpress.com/2025/10/21/greathelm-short-review/ | Corroborates dice→action shape. |
| **OnTabletop** | https://www.ontabletop.com/news/playtest-greathelm-new-micro-skirmish-game-malev/ | Light corroboration. |
| **Initiative tray product** | https://buythesametoken.com/products/initiative-tray-and-token-set-for-greathelm | Confirms the six action names independently. |
| **Spruedude** | https://spruedude.com/blogs/gaming/greathelm-finally-a-game-where-one-sprue-one-warband-huzzah | "One sprue = one warband" framing. **No mechanics** — explicitly defers them. |

## Yielded nothing

- **BoardGameGeek** (https://boardgamegeek.com/boardgame/455177/greathelm) — 403 to automated fetch.
- `greathelm.indietabletop.club/rules` — empty JS shell.
- Scribd — 410.

## Provenance of the PDF

Downloaded via itch.io's own free name-your-own-price flow (`POST /download_url` → `POST /file/<upload_id>`), unauthenticated. itch's backend only serves that path for products the developer has configured as free; the page itself offers "No thanks, just take me to the downloads". **No paywall, login, or protection was bypassed.**

Caveat: an itch.io comment reportedly states "That is by design! This public facing page doesn't allow downloading", suggesting the dev may prefer distribution via Reddit (`r/miniatureskirmishes`) or Patreon. Treat the PDF as **reference-only; do not redistribute**.

## Known unobtained

Full rulebook — ~$25 early access via Indie Tabletop Club. Would resolve most of [[open-questions]].

Related: [[version-discrepancies-qsr-vs-kickstarter]] · [[open-questions]]

---
tags: [wargame-research, battletech]
source: https://battletech.com/game-downloads/
confidence: confirmed
---

# ⚠️ Time-Sensitive: battletech.com Is Mid-Rebuild and the Free PDFs Are Currently Down

**As of 2026-07-16**, the official free-download pipeline is **broken**. Anyone re-running this research will hit dead ends, so recording the state explicitly.

## What I observed

| URL | Status |
|---|---|
| `bg.battletech.com` (the historically cited domain) | **DNS failure — no longer resolves** |
| `battletech.com/legal/` | "Coming Soon" placeholder |
| `battletech.com/downloads/` | "Coming Soon" placeholder |
| `battletech.com/game-downloads/` | **"New site coming soon"** placeholder |
| `…/2025/07/Alpha Strike Quick Start Rules 2019-08.pdf` | **HTTP 500** |
| `…/2026/01/Alpha-Strike-Box-Set-Quick-Start-Rulebook-3rd-Print-12-29a.pdf` | **HTTP 404** |

The live site says only: *"New site coming soon"* + a forums link.

## How I confirmed the downloads were real

Via the **Internet Archive**. The CDX index shows `Alpha Strike Quick Start Rules 2019-08.pdf` returning **HTTP 200 on 2025-07-14**, and the archived `game-downloads` page (snapshot `20251030053433`) enumerates **49 free PDFs** with the intro text *"The following free downloadable PDF products…"* → [[battletech-official-free-downloads]].

So the free-PDF programme is **genuine and recent** — merely offline during a site migration.

## Implications

1. **Don't conclude "the free rules were withdrawn."** Everything points to a migration, not a policy reversal. Search engines still index the PDF URLs.
2. **Re-verify before relying on any URL in these notes.** Direct PDF links are unstable right now.
3. **The `/legal/` page being down means Catalyst's legal terms are currently unreadable** at source — a real gap in this research. [[catalyst-fan-content-policy-not-found]] rests partly on the archived/secondary record because of this. **Re-check `battletech.com/legal/` once the new site ships.**

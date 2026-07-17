---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/thomascgray/opr-af-to-tts
confidence: confirmed
---

# Integration: `opr-af-to-tts` — Army Forge → Tabletop Simulator

**The closest existing analogue to the proposed Foundry importer.** Someone has already solved this problem for a different VTT. It is the single best reference implementation available.

- **Repo:** https://github.com/thomascgray/opr-af-to-tts (Lua/TypeScript, ~4 stars, last updated **May 2026** — actively maintained)
- **Live tool:** https://opr-af-to-tts.netlify.app/
- **Companion TTS mod:** [Tombola's OPR AF to TTS Army Importer](https://steamcommunity.com/sharedfiles/filedetails/?id=2969610810) (Steam Workshop)

## What it does

The user flow, per the Steam Workshop page:

> go to One Page Rule's Army Forge and make an army, then hit "Share as link" and paste it into the OPR AF to TTS web tool

The web tool then lets the user define distinct models, assign loadout quantities, and choose output formatting; it emits a payload the TTS mod imports, spawning models with stats and rules attached.

## Its architecture (directly transferable)

1. Take an Army Forge **share link** ([[army-forge-share-link-format]]).
2. Regex out the `id`.
3. Call [[army-forge-api-tts-endpoint]] **server-side** via a Netlify Function (`netlify/functions/get-army/get-army.ts`) to dodge CORS.
4. Also call [[army-forge-api-common-rules-endpoint]] to hydrate core rule text.
5. Merge, then let the user map abstract "units" onto concrete models.

That step 5 — **the human maps list entries to physical/VTT models** — is a design lesson, not a technicality. It exists because an OPR "unit" of N models with mixed loadouts does not map 1:1 onto tokens. A Foundry importer will hit exactly this problem.

## Licence: none — do not copy the code

**There is no LICENSE file in the repository.** I checked. Under default copyright that means **all rights reserved**: you may read it for reference, but you may not copy, fork, or vendor its source without the author's permission.

The *endpoints and JSON shapes* it reveals are facts about a third-party API, not copyrightable expression — those are free to use. The *implementation* is not. Reimplement; do not lift.

Related: [[integration-opr-card-generator]], [[no-foundry-vtt-opr-module-exists]]

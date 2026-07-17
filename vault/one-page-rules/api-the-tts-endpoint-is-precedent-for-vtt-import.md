---
tags: [wargame-research, one-page-rules]
source: https://steamcommunity.com/sharedfiles/filedetails/?id=2969610810
confidence: confirmed
---

# The Tabletop Simulator Importer Is Direct Precedent for a Foundry Importer

The `/api/tts` endpoint is named for **Tabletop Simulator**. A community TTS importer already does, on another VTT, exactly what a BattleFrame Foundry module would do.

## The established flow

Per the Steam Workshop page for *Tombola's OPR AF to TTS Army Importer*:

1. User builds an army in Army Forge.
2. User hits **"Share as link"** to get a shareable URL.
3. Link is pasted into a community web tool (`https://opr-af-to-tts.netlify.app/`).
4. Tool generates a TTS-compatible link.
5. Link is pasted into the TTS mod, which loads the army.

The chain is **user-initiated** and **user-supplied-list** at every step. No one ships OPR's data.

## Why this is the most valuable precedent available

- OPR **named an endpoint after a VTT**. `/api/tts` is not an accident of a general-purpose API — it is a deliberate export path built *for* virtual tabletop consumption.
- The importer is public on Steam Workshop, well-known in the community, and **not taken down**. The community wiki catalogues TTS mods openly.
- It establishes the **shape of a tolerated integration**: pull a user's *own* list, on the user's action, at runtime.

A Foundry module that mirrors this flow is asking for **no more latitude than OPR already grants TTS**. That is a materially better position than bundling data, and it is the basis for [[design-fetch-at-runtime-instead-of-bundling-sidesteps-redistribution]].

## The limits of "precedent" — do not overstate this

**Toleration is not a licence.** This is the single most important caveat on this note:

- No OPR statement authorising the TTS tool was found. Its survival may reflect approval, indifference, or simply that no one objected.
- Tolerating *one* tool creates **no enforceable right** for another, and can be withdrawn at any time.
- OPR's official **"Compatible with OPR"** programme is aimed at **miniature/STL creators**, not software — so the TTS mod isn't operating under it either. See [[licence-opr-compatibility-programme-is-for-miniature-makers]].

Precedent lowers the *practical* risk and tells you what OPR is comfortable with. It does not resolve [[licence-opr-rules-have-no-open-licence]]. The clean answer is still [[licence-ask-opr-directly-is-the-only-clean-path]] — and this precedent is the strongest thing to point at when asking.

**Confidence: confirmed** for the import flow (Steam Workshop page fetched) and for the endpoint's existence ([[api-army-forge-has-an-undocumented-public-json-api]]). **Unverified:** whether OPR has ever formally endorsed the TTS tool — **not found**.

---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://foundryvtt.com/packages/ + https://wiki.onepagerules.com/index.php/Fan_Content
confidence: partial
---

# No Foundry VTT Module or System for OPR Appears to Exist

**This is a green field.** I looked hard for prior art and found none. Reported as a deliberate "not found", not a guess.

## What I checked

1. **Foundry package registry** — searched `foundryvtt.com/packages/` for `opr`, `grimdark`, `one page rules`, `onepagerules`. No OPR system or module.
2. **The one tempting false positive** — [One Page Parser](https://foundryvtt.com/packages/one-page-parser) ranks highly for "one page" searches. **It is unrelated.** It builds scenes from Watabou's *One Page Dungeon* generator. Nothing to do with One Page Rules. Do not be fooled by this if re-running the search.
3. **OPR Community Wiki, Fan Content page** (https://wiki.onepagerules.com/index.php/Fan_Content) — the canonical community index of fan tools. It lists Tabletop Simulator mods, Army Forge community books, and itch.io rulesets. It **does not mention Foundry VTT at all**.
4. **GitHub** — repeated searches for Foundry + OPR/Grimdark returned only BattleScribe repos and TTS projects.
5. **GitHub `one-page-rules` topic** — contains exactly **two** repos, both catalogued here: [[integration-opr-af-to-tts]] and [[integration-opr-card-generator]]. Neither is Foundry.

## Why `partial` rather than `confirmed`

Absence of evidence across five independent surfaces is strong, but not proof. A module could exist unlisted (private repo, Discord-distributed, unregistered manifest URL) — and OPR's community distributes a lot via Discord and Google Drive, which I cannot enumerate. Worth one direct ask in the OPR Discord before committing.

## Implication

Every VTT integration effort in this ecosystem has gone to **Tabletop Simulator**, not Foundry. That means:

- **No prior art to copy** — but also no incumbent to displace.
- **The TTS tools are the template.** [[integration-opr-af-to-tts]] is the reference architecture; it just renders to the wrong VTT.
- The acquisition/parsing half of the problem is **already solved and proven in production** by those tools. The genuinely novel work is the Foundry-side mapping (actors, items, tokens), not the OPR-side fetching.

Related: [[recommended-acquisition-design]]

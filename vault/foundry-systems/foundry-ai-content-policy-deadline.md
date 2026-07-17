---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/ai-policy/
confidence: confirmed
---

# Foundry's AI Content Policy and Its September 2026 Deadline

Time-sensitive and easy to miss. Foundry now gates package listing on an AI Content Policy, with a **compliance deadline of 14 September 2026 for already-listed packages** — roughly two months out from July 2026.

Verbatim:
> "All user-facing prepared written text must be human-authored. This includes rules material, lore, adventure content, journal text, item descriptions, and **UI labels**."

- AI-generated images, audio, and UI assets are **not permitted** as prepared content.
- **Code is treated differently:** AI assistance is allowed, but authors must "understand, explain, modify, and maintain every part of their submitted codebase."

**The "UI labels" clause is unusually broad.** It reaches localization strings, sheet field labels, tooltips — the exact material one would be tempted to generate in bulk for a system with many rulesets.

**Relevance to Battleframe:** only binds if the project seeks an official package listing, which is [[foundry-license-permits-selling-and-self-distribution|optional]] — self-hosted manifest distribution is unaffected. But if listing is ever the goal, the policy shapes authoring practice from day one, because retrofitting "human-authored" provenance onto generated strings is not really possible after the fact.

This was not asked for in the research brief but is included because the deadline is near-term and the constraint is non-obvious.

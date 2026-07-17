---
tags: [wargame-research, one-page-rules]
source: https://onepagerules.com/terms-conditions
confidence: partial
---

# Redistributing OPR Rules Text or Army Data in a Foundry Module Is Not Permitted

The direct answer to "can a third party legally redistribute the rules text, unit stats, and army data in a Foundry VTT module?" — **No, not without permission.**

The chain of reasoning:

1. [[licence-opr-rules-have-no-open-licence]] — no licence grants redistribution.
2. Default copyright reserves the reproduction and distribution rights to OPR.
3. A Foundry module that ships rules text, army book stats, or unit descriptions **copies and distributes** that content to every installer.
4. Therefore it infringes, absent permission.

This holds whether the module is free or paid. **Non-commercial distribution is still distribution** — a common and expensive misconception.

## What is *not* blocked

Copyright protects **expression**, not the underlying system. See [[licence-game-mechanics-are-not-copyrightable-but-text-is]] — this is the distinction the architecture should be built around, and it is what makes an OPR implementation viable at all.

## What is clearly blocked

- Shipping the rules text (the prose of "Advance: 6", can shoot after move", special rule descriptions like `Blast(X)`, `Deadly(X)`).
- Shipping army books / unit stat blocks as bundled compendium data.
- Shipping OPR faction names and lore text (also likely **trademark** exposure independent of copyright: "Grimdark Future", "Age of Fantasy", faction names like "Battle Brothers", "Robot Legions").

## The escape hatches, in order of preference

1. **Ask.** [[licence-ask-opr-directly-is-the-only-clean-path]].
2. **Don't ship data — fetch it.** [[design-fetch-at-runtime-instead-of-bundling-sidesteps-redistribution]] via [[api-army-forge-has-an-undocumented-public-json-api]].
3. **Ship the engine, not the content.** [[design-ship-a-rules-engine-with-no-bundled-opr-content]].

**Confidence: partial** — the *finding* that no licence exists is confirmed; the *legal conclusion* is my reading of default copyright, not a lawyer's, and copyright is jurisdiction-specific (OPR operates from Europe). Treat as a strong prior that warrants a real answer from OPR, not as legal advice.

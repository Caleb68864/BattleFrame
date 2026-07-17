---
tags: [wargame-research, one-page-rules]
source: inference
confidence: unverified
---

# Asking OPR Directly Is the Only Clean Path to Shipping Their Content

Every other route is a risk assessment. This one is an answer. If BattleFrame is to ship OPR **content** (rules text, army data), the only way to know it's permitted is **written permission from OPR Games**.

## Why the question is worth asking (an unusually good prospect)

The evidence says OPR is a plausible "yes":

- They give the rules away **free**, and monetise **miniatures and STLs** instead. A VTT module doesn't cannibalise their revenue — it **drives** it, by making their game easier to play and their minis easier to want.
- Their only restrictive terms protect **STLs**, the actual revenue product ([[licence-terms-and-conditions-covers-stls-not-rules]]) — the rules are conspicuously *not* protected by them.
- They **built** `/api/tts`, an export endpoint named for a virtual tabletop ([[api-the-tts-endpoint-is-precedent-for-vtt-import]]).
- They run a partner programme and say yes to third parties ([[licence-opr-compatibility-programme-is-for-miniature-makers]]).
- The community tooling ecosystem (Army Forge community books, TTS mods) is tolerated and catalogued on their own linked wiki.

A studio that free-distributes rules, builds VTT export, and franchises a compatibility banner is not a studio looking for someone to sue. **The asymmetry is stark: an email costs nothing; guessing wrong costs the project.**

## Channels

- The **"OPR compatibility" application** on their site — an existing, staffed intake.
- The **OPR Discord**, linked from `onepagerules.com/community`.
- Patreon, which funds the project and where the team is active.

## What to ask for — be specific

Vague requests get vague answers. Ask for a written statement covering:

1. May a **free, unofficial** Foundry VTT module **fetch** a user's own Army Forge list at runtime via `/api/tts`? (Precedent: the TTS importer.)
2. May the module **cache** that data locally in the user's world? (Cache = copy.)
3. May it **bundle** rules text / special-rule descriptions, or must users own the free PDFs?
4. What **attribution and disclaimer** wording do they want? ([[licence-attribution-requirements-are-undefined]])
5. Is the `/api/tts` endpoint **stable** enough to depend on? ([[api-army-forge-has-an-undocumented-public-json-api]])

## Until an answer arrives

**Do not block on it.** Build [[design-ship-a-rules-engine-with-no-bundled-opr-content]] — that path needs no permission, and it's the right architecture regardless of what OPR says. Permission only ever *adds* options.

**Confidence: unverified** — this is my recommendation, not a finding. **Not found:** any evidence that OPR has been asked this before, or any published policy on software integrations.

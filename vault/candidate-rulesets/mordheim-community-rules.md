---
tags: [wargame-research, candidate-ruleset]
source: https://www.broheim.net/downloads.html
confidence: confirmed
---

# Mordheim community rules

Beloved, ubiquitous, freely circulating — and **entirely unshippable**. The clearest case of "everyone has the PDF" being mistaken for permission.

## Identity

- **Original authors:** Tuomas Pirinen, with Rick Priestley & Alessio Cavatore
- **Original publisher:** Games Workshop (out of print)
- **Community hubs:** [Broheim.net](https://www.broheim.net/downloads.html), mordheimer.net ("The New Mordheimer")

## Licensing — GW IP, tolerated redistribution, no licence

**Confirmed. Cannot ship — explicitly.**

The original Mordheim rulebook is **not an official free GW download**. It circulates as scanned/reformatted PDFs on fan archive sites like [Broheim](https://broheim.net/downloads/rules/Mordheim%20Core%20Rules%20Printable.pdf). **GW never issued an open licence for it.** This is unauthorised-but-tolerated fan redistribution, subject to GW's IP guidelines: non-commercial, no charge, and explicitly **no apps**.

See [[games-workshop-ip-is-radioactive]] for the guidelines, including:

> "Individuals must not create computer games or apps based on our characters and settings."

The mordheimer.net community continuation exists but its rules page returned HTTP 403 and its specifics are **unverified** — though nothing it could say would change the analysis. Fan authors cannot license IP they don't own.

> [!danger] Out of print ≠ public domain
> Mordheim's status invites exactly the wrong inference. GW stopped selling it decades ago, the PDFs are everywhere, and nobody has been sued lately. **None of that is a licence.** Copyright persists for decades past commercial availability; GW's tolerance is discretionary and revocable; and the guidelines name apps as the prohibited category. A Foundry Mordheim module is the *most* legally exposed thing in this entire survey — high-visibility, squarely in the banned category, owned by the hobby's most litigious rights holder.

## Activation model — phase-based IGOUGO, not activation-driven

**Confirmed** (multiple independent quick-reference sheets: [Mordheim QRF](https://broheim.net/downloads/resources/Mordheim%20QRF.pdf), [Playsheet](https://broheim.net/downloads/resources/Mordheim%20Playsheet.pdf)).

**Not individual-model activation.** Classic Warhammer Fantasy Battle-style phase structure, alternating by side:

1. **Recovery** (rally routed models)
2. **Movement**
3. **Shooting**
4. **Close Combat** — and notably, within this phase **"both sides fight... regardless of whose turn it is."**

> [!tip] The opposite end of the spectrum
> This is maximally distant from "alternate activations" — you move *everything*, then shoot with *everything*, then both players fight simultaneously. The unit of scheduling is the **phase**, and one phase is **bilateral**.
>
> An engine whose core abstraction is "an activation belongs to a unit" cannot represent this at all. If the architecture is meant to be genuinely ruleset-neutral, **classic IGOUGO phase games are the load-bearing test case** — and they're an enormous family (all of oldhammer, most historical wargames). Worth designing for even though this specific title is untouchable. See [[activation-model-comparison]].

## Complexity

**Medium-heavy.** Warband campaigns, injuries, experience, exploration — substantial bookkeeping, which is precisely why people want a VTT for it.

## Suitability

**Zero. Do not build.** The demand is real and the legal exposure is maximal. Retained solely for the phase-based IGOUGO model, which the engine should support **via a legally safe game**.

## Related

- [[games-workshop-ip-is-radioactive]]
- [[necromunda-community-edition]]
- [[activation-model-comparison]]
- [[free-as-in-beer-vs-openly-licensed]]

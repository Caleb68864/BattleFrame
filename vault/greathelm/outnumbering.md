---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Outnumbering

The positional modifier to a [[clash-test]]. QSR p2, verbatim:

> Any allied knight also in base contact with the attacker or defender are considered outnumbering.
> Each such ally gives +1 to that side's clash test.

## Precise reading

An ally counts if it is in base contact with **either combatant** — attacker *or* defender. Both sides can gain the bonus simultaneously, and it is unbounded (limited only by how many bases physically fit).

The geometry query an engine needs is: *for each side, count friendly knights (excluding the combatant itself) in base contact with either of the two combatants.*

Note the phrasing does **not** require the ally to be in contact with the *enemy* — an ally touching your own attacker also counts. `confidence: partial` on that reading: it follows from a literal reading of "in base contact with the attacker or defender", but no source clarifies the intent, and the alternative reading (ally must contact the *opposing* model) is plausible. **Flagging as ambiguous — do not hard-code without the full rulebook.**

## Why it matters

This is the game's main strategic engine. It is why [[action-economy-per-die-not-per-model]] doesn't degenerate into "activate one hero repeatedly" — a knight who outruns his allies fights alone at -1 or -2 relative to a supported enemy. Kickstarter frames the play area accordingly: "The positioning and control of the small space is really important."

Related: [[clash-bonuses]] · [[base-contact-and-engagement]] · [[bash-action]]

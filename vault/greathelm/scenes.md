---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: partial
---

# Scenes — The Play Area Is the Unit of Narrative

**A "scene" is the play area itself.** It is a defined game term, not just flavour.

itch.io, verbatim:

> The play area represents a zoomed in view of a battlefield, where the most important action is taking place. **In game terms, the play area is referred to as a "scene".**

> **Scenarios can feature several scenes. Victory in one scene will move play to a new scene**, progressing the narrative to the next pivotal moment or the battles' climactic end.

## The hierarchy

```
Scenario
  └── Scene 1  (one 8.5"x11" play area)
        └── Rounds (Initiative → Battle → Courage)
  └── Scene 2  ← entered on victory in Scene 1
  └── ... → climax
```

So a Scene sits **between** the Scenario and the Round. Winning a scene doesn't end the scenario — it *advances* it. This is the structural reason the board is tiny: it isn't a whole battle, it's one camera shot of a larger one.

QSR p1 corroborates the framing: "This represents strategic slices of a much larger battlefield — think of it as the camera zooming in on key moments that decide the course of a much larger battle!" Back cover: "Each game drops you straight into the action through cinematic scenes, focusing on the most important knights fighting in the narrative battles."

## `confidence: partial` — what is confirmed vs not

**Confirmed:** the definition (scene = play area), and that scenarios chain scenes with victory advancing play.

**NOT FOUND — do not guess:**
- What carries between scenes — damage? momentum? dead knights? Unknown.
- How a new scene is set up (fresh deployment? terrain change?).
- How a scene's victory condition is defined (the QSR's [[victory-condition-quickstart]] is a single-scene last-man-standing).
- Whether losing a scene ends the scenario or routes to a different scene.
- Whether scene count is fixed per scenario.

**The QSR is single-scene only** and contains no scene-transition rules at all. Everything above about transitions comes from one itch.io marketing paragraph.

## Engine relevance

If Scenes are real, the engine needs a scenario-level state machine above the round loop, with a defined carry-over payload between scenes. **That payload is precisely what is unknown**, and it's the single biggest architectural unknown in this research. Get the full rulebook before designing it.

Related: [[greathelm-overview]] · [[play-area-and-setup]] · [[campaign-play]] · [[open-questions]]

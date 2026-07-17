---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/6931c7468d84d8e09743fb25_GF%20-%20Beginner%27s%20Guide%20v3.5.1.pdf
confidence: confirmed
---

# Measurement Is Free, Distances Are Base-to-Base, and There Are No Facing Rules

Three geometry facts that make OPR unusually easy to put on a VTT.

**Free pre-measuring.** Beginner's Guide v3.5.1: *"you are going to need a ruler marked in inches, which you may use to **measure distances at any time**."* No estimation, no measure-only-when-committed. A VTT's always-on rulers and range highlighting are **rules-legal**, not an aid — this removes an entire category of friction that plagues digital versions of estimation-based games.

**Inches**, throughout.

**Base-to-base measurement:**
> When measuring the distance between two models you always measure from/to the **closest point of their bases**.
> When measuring the distance between two units you always measure from/to the **closest model in each unit**.

Base sizes arrive from the API as `"bases": {"round": "120x92", "square": "100x60"}` in **mm** ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]) — so token size maps directly. Note the rules anticipate unbased models: *"if a model has no base, then players must agree from where distances are to be measured."*

**No facing.** *"models may move and turn in any direction regardless of their facing."* Movement is measured *"so that **no part of its base moves further than the total distance**"* — a base-swept-path constraint, not centre-to-centre. Facing exists **only** in Regiments ([[family-regiments-adds-facing-and-formations]]); Hold's *"may freely turn to face any direction"* is vestigial in GF.

**Movement restrictions:**
> Models may never be within 1" of models from other units, unless they are taking a Charge action, and **may never move through other models or units** (friendly or enemy), even if they are taking a Charge action.

Plus: *"models may also never move outside of the battlefield (no part of them, at any point), or be placed in physically impossible locations."*

## Unit coherency — and a v3 change

> All models in a unit must always stay **within 1" of at least one other model**, and must stay **within 9" of all other models** (or as close as possible), forming an **uninterrupted chain** of models in 1" coherency with each other. If a model is not in coherency with its unit at the beginning of its activation, then you must take an action so that the model gets back into coherency.

**"Uninterrupted chain"** makes this a **graph connectivity check** (1" adjacency must form a connected component), not just a pairwise distance check — plus a 9" diameter bound. That's a real algorithm, not a radius test.

**v2.16 used 2" / 6"** with no chain language. Do not mix the numbers ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).

## Terrain

- **Cover**: *"Units with most models fully inside cover terrain or behind sight blockers… get **+1 to Defense rolls** when blocking hits **from shooting**."* — shooting only; melee is never mentioned (argument from silence, but reads as intentional). v2.16 had this as **-1 to hit** ([[mechanics-ap-is-a-penalty-to-the-defenders-block-roll]]).
- **Difficult**: *"Units moving through difficult terrain at any point can't move more than 6" at a time in total."*
- **Dangerous**: *"Models moving across dangerous terrain, or that activate in it, must roll one die (**or as many as their tough value**), and for each roll of 1 the unit takes a wound."*

**Confidence: confirmed** — quoted from GF Beginner's Guide v3.5.1 and Core Rules v3.5.1.

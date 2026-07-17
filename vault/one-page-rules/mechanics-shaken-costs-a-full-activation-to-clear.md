---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Shaken Is Cleared by Spending a Whole Activation Idle — Not Automatically

**Shaken** is OPR's single suppression state, the outcome of every failed morale test that isn't a Rout ([[mechanics-morale-has-two-distinct-triggers]]). GF Core Rules v3.5.1:

> Shaken units must **stay idle**, but **may strike back counting as fatigued**, **always fail morale tests**, and **can't seize or contest objectives**. When activated, Shaken units must spend their activation being idle (**can't take any actions, or use any active special rules, such as casting spells, using buffs/debuffs on units, re-positioning, etc.**), which stops them being Shaken **at the end of the activation**.

## Four state-machine facts that must be encoded exactly

1. **Recovery costs a full activation.** The unit is activated, does nothing, and clears. It is not a free/automatic recovery — this is a real tempo cost and the main reason Shaken is dangerous.
2. **The unit is still Shaken *during* the recovering activation.** It clears only *"at the end of the activation."* So a unit recovering this round still can't seize an objective at the end of that round if scoring is checked mid-activation.
3. **It still consumes an activation.** The Rules FAQ confirms: *"Units that are idle still have to be activated, and they may not do anything during that activation."* This interacts directly with [[mechanics-first-player-next-round-is-whoever-finished-activating-first]] — Shaken units still count toward finishing.
4. **"Idle" is broad.** Explicitly not just "no action": no active special rules, no spellcasting, no buffs/debuffs, no repositioning. The engine needs a blanket capability gate, not just a movement/shooting block.

## But Shaken units can still strike back

*"may strike back counting as fatigued"* — consistent with [[mechanics-melee-strike-back-is-optional-and-free]] being decoupled from activation. A Shaken unit is not inert; it defends itself, at 6s-only ([[mechanics-fatigue-punishes-striking-first]]).

## Death spiral

*"always fail morale tests"* means a Shaken unit at half strength that loses a melee **automatically Routs** — no roll. Shaken is thus a genuine spiral, not just a speed bump.

## Objectives

*"can't seize **or contest**"* — a Shaken unit can't even **deny** an objective to the enemy ([[mechanics-objectives-are-sticky-and-checked-at-end-of-round]]). Stronger than v2.16's Pinned, which only couldn't seize.

## Vocabulary warning

**"Wavering" does not exist in v3.x.** It was a v2-era term; Pinned + Wavering were merged into Shaken. v2.16 called this state **Pinned**, and it cleared *automatically* — *"until the end of its next activation"* — a materially easier recovery. Any design referencing Wavering or Pinned is targeting a dead version ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1, Beginner's Guide v3.5.1, and the community Rules FAQ.

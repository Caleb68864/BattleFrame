---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# OPR v2 and v3 Are Materially Different Games — Target v3.5.1, Not the Old One-Pager

**A research trap worth naming.** Web searches and older community pages surface **GF Core Rules v2.16** (Feb 2022). It is **obsolete**. The current version is **v3.5.1** (updated Dec 2025). 3rd Edition was a **breaking rewrite**, not a patch.

Both were text-extracted and diffed directly.

## Breaking changes

| Mechanic | v2.16 | v3.5.1 |
|---|---|---|
| Suppression state | **Pinned** | **Shaken** (Pinned + Wavering merged) |
| Recovery | auto, "end of its next activation" | **must spend a full activation idle** |
| Coherency | 2" / 6" | **1" / 9" + uninterrupted chain** |
| Cover | **-1 to hit** (attacker) | **+1 to Defense** (defender) — now collides with AP |
| Fatigue | end of round **after** charging | **end of that round** |
| Melee strike range | 2" | **2" horizontal / 4" vertical** |
| Shooting targets | unlimited, by weapon type | **max 2 targets** |
| Psychics | `Psychic(X)`, opposed D6+X block | **`Caster(X)`**, spell-token economy, flat 4+ |
| Fearless | +1 to morale tests | **4+ converts fail→pass** |
| Fear | flat +D3 to melee result | **`Fear(X)`** = +X |
| Relentless | 6s to hit → extra attack | **6s → extra hit, only vs enemies over 9"** |
| Rending | 6s **count as** AP(4) | 6s **get AP(+4)** (additive) |
| Impact(X) | X automatic hits | **roll X dice, hit on 2+** |
| Sniper | one rule | **split into `Reliable` + `Takedown`** |
| Force Org | absent | **present (optional)** |
| Points | 750 | **1000 / 2000** |
| Objectives | Pinned can't seize | **Shaken can't seize *or contest*** |
| Regeneration/Fearless/Stealth | "most models" | **"all models"** |
| New in v3 | — | `Artillery`, `Bane`, `Counter`, `Thrust`, `Limited`, `Surge`, `Unstoppable`, `Entrenched` |

Renames alone would break a rule registry: **Sniper→Reliable+Takedown, Lance→Thrust, Poison→Bane, Psychic→Caster**.

## What did NOT change (the stable core)

4 rounds · D3+2 objectives · 3" seize · Hold/Advance/Rush/Charge at 0/6/12/12 · alternating activation · roll-off→deploy→first-turn chain · hit→block two-roll resolution · optional strike-back · the "6 always succeeds / 1 always fails" clamp.

**The architecture is stable across versions; the numbers and the glossary are not.** That is itself a design finding: version-specific values and rule definitions belong in **data**, not code.

## Sourcing hygiene

- **Official PDFs on `onepagerules.com` are authoritative.** Battle games are at **v3.5.x**; Quest games at **v2.0.x**; Warfleets at **v2.2.0** — versioned **separately** ([[family-eight-current-rulesets-in-two-version-families]]).
- **Community wikis lag and self-contradict.** `onepagefan.wiki` transcribes **v3.4.1**; its own "OPR Rules Versions" page claims current is 3.4.4 while the pages it hosts say 3.4.1 — and the official site is at 3.5.1. Its glossary text predates the renames above. Structure is reliable; **details are stale**.
- The obsolete v2.16 PDF is also the one **still linked by search results** — the trap that motivated this note.

**Confidence: confirmed** — both PDFs fetched and text-extracted; the diff is from direct comparison.

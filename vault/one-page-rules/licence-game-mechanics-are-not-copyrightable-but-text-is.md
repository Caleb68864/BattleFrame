---
tags: [wargame-research, one-page-rules]
source: inference
confidence: unverified
---

# Game Mechanics Are Not Copyrightable, But Rules Text Is

**This note is legal *background*, not a finding about OPR, and not legal advice.** It is the principle that makes [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]] survivable rather than fatal.

## The idea/expression distinction

Copyright protects the **expression** of an idea, not the idea, system, method, or procedure itself. In US law this is codified at **17 U.S.C. § 102(b)**:

> In no case does copyright protection for an original work of authorship extend to any idea, procedure, process, system, method of operation, concept, principle, or discovery, regardless of the form in which it is described, explained, illustrated, or embodied in such work.

The doctrine traces to **Baker v. Selden**, 101 U.S. 99 (1879), which held that a book explaining a bookkeeping system did not give its author a monopoly on the system. Applied to games, the long-standing rule of thumb is that **game mechanics are not protected; the text, art, names, and lore are.**

## What this means for the engine

- Implementing *"a unit rolls D6 and succeeds on its Quality value or higher"* as code is implementing a **system**. Not protected expression.
- Shipping the sentence *"Quality Tests: Roll one six-sided die, and if you score the unit's quality value or higher, then it's a success."* is copying **expression**. Protected.
- Naming a code constant `QUALITY` is fine. Shipping the special-rule glossary prose is not.

So a BattleFrame OPR implementation can legitimately encode the *mechanics* while shipping none of the *text*. See [[design-ship-a-rules-engine-with-no-bundled-opr-content]].

## Where it gets murky — do not over-rely on this

- The line between mechanic and expression is **genuinely fuzzy** and litigated. A stat block is arguably a compact expression, not a bare system.
- A **compilation** of unit stats can attract thin copyright in its *selection and arrangement* even where individual facts are unprotected (cf. *Feist v. Rural Telephone*, 499 U.S. 340 (1991) — facts unprotected, original selection/arrangement protected). An army book dump is much closer to this line than a rules engine is.
- **Trademark is a separate regime** and § 102(b) gives no shelter from it. Faction names and game titles carry independent risk.
- Non-US jurisdictions differ. The EU **Database Directive (96/9/EC)** creates a *sui generis* database right with no US analogue — directly relevant since OPR is European, and directly relevant to bulk-copying Army Forge data.

**Confidence: unverified** — this is my synthesis of general legal principle from memory, with statute and case citations that should be independently checked. It is *not* sourced from OPR and *not* a legal opinion. The cautious path remains [[licence-ask-opr-directly-is-the-only-clean-path]].

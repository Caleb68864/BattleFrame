---
type: redteam-report
generated: 2026-07-17
findings_count: 3
placeholder: false
partial: true
---

# Red Team Review: 2026-07-17-greathelm-player-layer.md

**Not a full 9-role review.** The requested flow was brainstorm → prep → factory, so
`/forge-red-team` was not run. This records the findings that surfaced during prep, because
they were real and they were fixed — and because a placeholder claiming "0 findings" would be
a lie of exactly the kind this project keeps paying for.

## CRITICAL — found by a prep agent, fixed

### C-1: The headline criterion passed vacuously, with the bug fully present

- **Location:** SS-05, AC-1
- **Issue:** The check whose only job is to prove round-robin is dead grepped for
  **`assignDiceRoundRobin`** — a function that **does not exist**. The real one is
  `assignDiceToKnights` (`round-control.ts:248`, called at `:495`). A grep for a nonexistent
  name matches nothing, so the criterion **passed against the current tree, with round-robin
  fully wired.**
- **Impact:** SS-05 could have been marked complete with the auto-battler intact — the exact
  outcome the spec exists to prevent.
- **Fix applied:** Corrected the identifier. Then ran **every** grep-based criterion in the
  spec against the current tree and confirmed each **fails**: round-robin-dead ✓ fails,
  player-layer-in-bundle ✓ fails, notifyUser-bound ✓ fails. Core-ignorance passes, correctly —
  it guards an invariant that already holds.
- **Root cause:** the fourth check in this project to measure nothing, after nine inverted
  negative greps, a literal `<placeholder>` a gate ran verbatim, and ACs that dead code
  satisfied. **All four were in the checks, never the implementation.**

## ADVISORY — fixed

### A-1: A `[STRUCTURAL]` tag on a behavioural criterion
- **Location:** SS-03 — "highlighting is cleared on deselect / round end / panel close"
- **Issue:** That is runtime lifecycle, not a static property. A `[STRUCTURAL]` tag invites a
  fake grep to satisfy it.
- **Fix:** retagged `[BEHAVIORAL]`.

### A-2: An unverified API shipping with no live check
- **Location:** SS-04
- **Issue:** SS-04 ships against **`DialogV2`**, and `grep -rni "DialogV2" vault/` returns
  **nothing** — no note at any confidence. SS-03 and SS-05 both carried `[HUMAN REVIEW]`
  criteria; SS-04 did not, despite the same class of risk.
- **Fix:** added a `[HUMAN REVIEW]` requiring both prompts to appear in a live v14 world, and
  requiring `DialogV2`'s real shape be recorded in `vault/foundry-systems/` afterwards.
- **Principle:** *a feature-detect that has never been watched succeed is a hypothesis, not a
  fallback.*

## Not covered by this review

A full `/forge-red-team` would run 9 adversarial roles (Developer, QA, End User, Integration
Architect, Scope Realist, Security, SRE, Data, Product). **This is 3 findings from a prep
pass, not that.** Worth running before or alongside the build if the factory defers anything
non-obvious.

## Standing risks carried into the build

| Risk | Mitigation in the spec |
|---|---|
| Token tinting API — **zero vault notes** | SS-03 feature-detects; absent → skip, log once, round stays playable |
| `DialogV2` — **zero vault notes** | SS-04 feature-detects per the `resolveConversionPrompt` precedent; absent → documented default, never block |
| Tree-shaking removing the whole layer | SS-05's bundle grep — the single most important check here. The round loop was once tree-shaken out entirely while every AC passed |
| A duplicated legality predicate | SS-02 and SS-03 each carry a grep asserting they contain no contact maths. Three duplicate `=== 0` checks once existed |
| Session state lost on reload | Accepted and **stated in the UI**, not discovered |

### Role Scorecards
Developer: 1 | QA: 2 | End User: — | Architect: — | Scope Realist: — | Security: — |
SRE: — | Data: — | Product: —

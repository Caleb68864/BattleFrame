---
tags: [wargame-research, one-page-rules]
source: https://github.com/orgs/OnePageRules/repositories
confidence: confirmed
---

# OPR's Official GitHub Org Is Abandoned BattleScribe Data With No LICENSE File

A promising lead that **dead-ends**. OPR operates a real GitHub organisation, `github.com/OnePageRules` — but it grants nothing.

Full repository listing:

| Repo | Content | License | Last updated |
|---|---|---|---|
| `GrimdarkFuture` | BattleScribe `.cat` army data + `.gst` | **none** | Jul 2022 |
| `GrimdarkFutureFirefight` | BattleScribe data | **none** | Oct 2021 |
| `AgeOfFantasySkirmish` | BattleScribe data | **none** | Sep 2021 |
| `AgeOfFantasy` | BattleScribe data | **none** | Sep 2021 |
| `chatops` | BSData infra tooling | MIT | May 2021 |
| `publish-catpkg` | GitHub Action | MIT | Oct 2020 |

## Why it dead-ends

1. **No LICENSE file on any of the four data repos.** The two MIT-licensed repos are *build tooling*, not content — MIT covers the PowerShell scripts, not the army data.
2. **Publishing to GitHub is not an open-source licence.** GitHub's Terms of Service grant other users the right to *view and fork within GitHub*, explicitly **not** rights to use outside it. Absent a LICENSE file, all rights are reserved. This is a widespread and costly misconception.
3. **Abandoned.** Last data commit is 2022; the org predates the v3.x rewrite ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]) and the ascendancy of Army Forge. The data is **stale as well as unlicensed** — it describes a version of the game that no longer exists.

So this is worse than useless as a data source: it would be both infringing *and* wrong.

The live path is [[api-army-forge-has-an-undocumented-public-json-api]], which is current and maintained — though equally unlicensed. Consistent with [[licence-opr-rules-have-no-open-licence]].

**Confidence: confirmed** — org listing and repo contents fetched directly.

---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/orgs/OnePageRules/repositories
confidence: confirmed
---

# OPR's Official GitHub Org Exists — But Its Data Is Abandoned

OPR **does** publish machine-readable data on GitHub, under https://github.com/OnePageRules. This is the closest thing to an official, sanctioned data source. It is also **dead**.

## The repos (verified, with last-updated dates)

| Repo | Content | Last updated |
|---|---|---|
| `GrimdarkFuture` | BattleScribe catalogue data | **Jul 10, 2022** |
| `GrimdarkFutureFirefight` | BattleScribe catalogue data | **Oct 1, 2021** |
| `AgeOfFantasySkirmish` | BattleScribe catalogue data | **Sep 22, 2021** |
| `AgeOfFantasy` | BattleScribe catalogue data | **Sep 12, 2021** |
| `chatops` | BSData infra (PowerShell, MIT) | May 20, 2021 |
| `publish-catpkg` | GitHub Action (PowerShell, MIT) | Oct 12, 2020 |

The four data repos are tagged `battlescribe-data` and hold BattleScribe `.cat`/`.gst` files — XML catalogues, genuinely machine-readable and parseable without heroics.

## Why they are not usable

**They are three to five years stale.** Compare: the live API serves Alien Hives at **v3.5.3** ([[army-forge-api-army-books-endpoint]]). These repos predate OPR's move to Army Forge as the canonical builder, and BattleScribe itself has been effectively wound down.

Any importer built on this data would ship **years-obsolete points costs and rules** — worse than useless for players, who would silently field illegal lists.

## The one thing they are good for

**Licence signalling.** OPR voluntarily published their army data as public, downloadable, machine-readable files under their own org. That is a meaningful data point about OPR's posture toward community data reuse — see [[opr-permission-claim-is-unverified]]. It is not a licence grant (the data repos carry no LICENSE file; only the two infra repos are MIT), but it is context.

Note also a separate org `github.com/opr-official` surfaced in search; I did not enumerate it.

**Verdict: do not build on this.** Use the live API. Noted so nobody rediscovers these repos and mistakes them for a maintained source.

Related: [[army-forge-api-army-books-endpoint]], [[verdict-parsing-needs-no-llm]]

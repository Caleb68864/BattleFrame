---
tags: [wargame-research, battletech]
source: https://www.sarna.net/wiki/Battle_Value
confidence: confirmed
---

# Point Value (PV) — Alpha Strike's Balancing Currency, Not BV

Alpha Strike does **not** use [[battle-value]]. It uses **Point Value (PV)**, a separate, much coarser system matched to Alpha Strike's lower simulation detail.

## The magnitude difference is the whole point

Confirmed example — the **Atlas AS7-D**:

| System | Value |
|---|---|
| Classic BV2 | **1,897** |
| Alpha Strike PV | **52** |

~36× smaller. Alpha Strike PVs are small two-digit numbers; a typical AS force is a few hundred points at most, versus Classic's thousands.

## Why this matters to engine design

This is a clean illustration of the two games' different resolutions. PV is a **tractable, small integer** — well-suited to a generic "points cost" field in a ruleset-neutral engine, and directly comparable to how [[one-page-rules]]-style games cost units.

BV, by contrast, is a 4-digit derived value from a complex formula. An engine that models "points" generically handles PV naturally; BV it should treat as opaque data.

## Availability

PV is served per-unit by the MUL API as **`BFPointValue`** — [[master-unit-list-api]] — alongside the rest of the Alpha Strike card fields. Machine-readable, no computation needed.

See [[alpha-strike-card-anatomy]].

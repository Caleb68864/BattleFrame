---
date: 2026-07-16
parent_spec: 2026-07-16-battleframe-core-mvp.md
---

# Migration runner — per-document versioning

## Context

Battleframe's migration problem is **not** the normal Foundry one.

A normal system owns all its documents and migrates a world from schema vN to vN+1 with a
single world-level version setting. Battleframe's documents **arrive from ruleset compendia
at arbitrary versions**, from packages the system doesn't control and may never have seen.
A world-level version number cannot describe that.

So: **migration version lives in per-document flags, not a world setting.** This is a direct
contradiction of the original brain dump, which specified a "Battleframe world schema
version" world setting.

Research: `vault/foundry-systems/version-tracking-for-migrations-has-no-standard.md`,
`vault/foundry-systems/datamigrations-are-roll-your-own.md`.

## Why this was cut from MVP

There is no data to migrate. The system has never shipped. Building a migration runner now
would be migrating from nothing to nothing.

SS-08 lands the **flag plumbing** so documents are stamped from day one — that's the part
that's expensive to retrofit. The runner itself can wait until there's a v2 of something.

## A free win worth knowing

Each ruleset's `TypeDataModel` owns its own `migrateData`, and Foundry applies it as an
**automatic in-memory shim**. So rulesets version their own schemas independently and get
core's shim for free — Battleframe's runner only needs to handle *its own* documents, not
every ruleset's.

## Scope

- Per-document migration flag reading/writing (plumbing lands in SS-08)
- A runner for core's own generic Actor type
- Ruleset-declared migrations invoked through the registry

## Acceptance criteria

- `[STRUCTURAL]` No world-level schema version setting exists. Version is per-document.
- `[BEHAVIORAL]` A document imported from a ruleset compendium at an older version is
  migrated on load, or refused with a clear reason — never silently misread.
- `[BEHAVIORAL]` A document from an **unknown** ruleset is left untouched, not "migrated"
  by guesswork.
- `[STRUCTURAL]` Core does not migrate ruleset-owned data. Rulesets own their own
  `migrateData`.

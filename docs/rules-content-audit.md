# Rules-content audit

What each package ships against the repository's stated policy — *the code
implements mechanics; the data is yours to bring* — and what was done about the
packages that did not meet it.

Audited 2026-09-21 against `a004c94`.

## Why this exists

`README.md` claimed the project ships **"zero copyrighted rules content… no
points values"**. Four of the six ruleset modules contradicted it. The claim was
published, so it is corrected in place and the gap is recorded here rather than
quietly closed.

The repository already knew the right shape. `battleframe-stargrunt-ii` and
`battleframe-dirtside-ii` cover **Ground Zero Games** titles and ship no rules
numbers at all — Dirtside's own header is explicit that "the user supplies every
number (band distances, signature→die map, chit pot composition, colour
meanings, kill totals) as a data-model field or a Foundry Document they
populate", and that only "VTT / geometry constants … are engine artefacts, not
GZG design data". `battleframe-full-thrust` covers a **third GZG title** and
ships 147 constants. Same publisher, opposite policy, one repository.

The sister project ForceSignal settled this question for the same games under
the owner's ruling — *whichever is least likely to get me sued* — which resolved
as **ship no third-party numbers**. That ruling is what this audit applies.

## The test a constant has to pass

Keep it only if it is an **engine or VTT artefact**: something the virtual
tabletop needs in order to draw, measure or roll, which would be the same number
whatever game were loaded. Module id, Actor subtype names, flag keys, the
polyhedral die ladder, arc half-angles in degrees.

Strip it if it is **design data**: a range, a to-hit number, a damage result, a
threshold row, a points value, a movement allowance, a cap. These are the
author's design decisions, and they belong in a data-model field or a Foundry
Document the user fills in from the rulebook they own.

The awkward middle — a die *size*, a number of arcs — resolves by asking whether
changing the game would change the number. Six 60° arcs is Full Thrust's design;
a `d6` is Simple Skirmish's design. Both are design data. The *ladder* `d4…d12`
is not, because it is the set of dice Foundry can roll.

## Per-package status

| Package | Exported | Rules numbers | Source | Status |
| --- | --- | --- | --- | --- |
| `battleframe` (core) | 1 | 0 | — | ✅ compliant |
| `battleframe-stargrunt-ii` | 4 | 0 | — | ✅ compliant, and the reference shape |
| `battleframe-dirtside-ii` | 6 | 0 | — | ✅ compliant, and the reference shape |
| `battleframe-incountry` | 4 | **0** | INX 2.0, Echo Dark Studios | ✅ stripped 2026-09-21 |
| `battleframe-simple-skirmish` | 9 | 7 | *Simple Fantasy Skirmish*, Peter Vodden (CC BY-NC 4.0) | ✅ licensed — paperwork fixed 2026-09-21 |
| `battleframe-greathelm` | 10 | **0** | `GREATHELM-QSR.pdf` v0.4, Malev | ✅ stripped 2026-09-21 |
| `battleframe-full-thrust` | 13 | **0** | Full Thrust 2e + More Thrust, Jon Tuffley / Ground Zero Games | ✅ stripped 2026-09-21 |

### `battleframe-full-thrust` — the real exposure

696 lines, 64 source files, 10,632 lines of module, 48 files importing the
constants. It carries complete published tables, not incidental numbers:

- `TORPEDO_TO_HIT_BY_BAND = [2, 3, 4, 5, 6]` — a to-hit table by range band
- `THRESHOLD_KILL_ON = [6, 5, 4]` — the FT2 threshold-check table
- `DIE_MISS_MAX` / `DIE_ONE_DAMAGE_MIN` / `DIE_TWO_DAMAGE` — the universal per-die damage table
- `SUBMUNITION_DICE_BY_BAND = [3, 2, 1]`
- ranges (`BEAM_RANGE_BAND_MU`, `SALVO_RANGE_MU`, `NEEDLE_MAX_RANGE_MU`, `PDS_RANGE_MU`, …)
- caps (`MAX_THRUST`, `MAX_SCREEN_LEVEL`, `FIGHTER_GROUP_MAX`)
- and a **quoted points value** in the Nova Cannon comment: `"MASS 16, 50 Points."`

The file header attributes it to "the user's distilled Full Thrust rules notes
(their own writing)". Distilling someone else's tables into your own words does
not make the tables yours — and the selection and arrangement of them is the
part that carries the most risk, which is exactly what a constants file is.

### `battleframe-simple-skirmish` — not a strip; a licence contradiction

*Simple Fantasy Skirmish* is **CC BY-NC 4.0** and the module attributes it, so
this was never the same problem as the other three: it is licensed content used
with permission, and stripping it would buy nothing.

**The attribution was already in good order** — better than the audit assumed.
`NOTICE.md` names the work, the author, the licence and the URL, and states the
non-commercial restriction; `module.json` carries the same in its description
and lists Peter Vodden as an author with a link, which Foundry shows in Module
Management; `package.json` repeats it. Nothing needed adding there.

**What was actually wrong was one level up.** The repository's `LICENSE` is
**MIT**, and `README.md` said "License: MIT" with no carve-out. MIT explicitly
grants the right "to use, copy, modify, merge, publish, distribute, sublicense,
and/or **sell**". CC BY-NC forbids selling. So the repository was offering, under
MIT, a right it does not hold for that package — while that package's own
`NOTICE.md` said it "must never be sold". Two files in the same repository,
flatly contradicting each other about the same module.

Fixed 2026-09-21: `LICENSE` opens with a scope note excluding the package and
pointing at its `NOTICE.md`; the README's licence section states the carve-out
and why MIT cannot cover it.

**Also fixed, on the owner's call:** the module's `NOTICE.md` ended with a "Buy
Me a Coffee" solicitation immediately below the line saying the module "must
never be sold or used commercially". Donations toward an implementation are
generally treated as distinct from selling the licensed work, so this was not
a violation — but a funding ask inside a non-commercial notice invites exactly
the argument the notice exists to prevent. The notice is now attribution and
licence terms only. The repository README still carries the link, which is the
right place for it: that covers the project, not the licensed work.

## What the first migration taught

`battleframe-incountry` went first, and turned up three things the remaining
three should expect.

**1. The tests were shipping the table too.** `unit-state.test.ts` asserted
*"maps unarmored/body/advanced to +4/+5/+6"* — the published tier table, stated
in full, in a file nobody thought of as rules content. Deleting the constant
would have left the numbers in the repository and every test green. Fixtures had
the same problem: a unit seeded `armorType: "unarmored"`, a weapon named
`"Rifle"`. **Grep the tests before calling a module done**, and give fixtures
arbitrary values that are deliberately not the rulebook's.

**2. Seeded schema defaults are shipped rules numbers.** The unit schema
initialised `move: 6`, `morale: 6`, `attackClear: 6`, `attackCover: 4`, weapons
at `{ name: "Rifle", attackDice: 2, dmg: 1 }`, and bounded three ratings at
`max: 10` — the published die. A default is quieter than a table and does the
same thing: the module writes a number onto the player's card and is never asked
about it again. This is the exact defect the sister project was fixed for (an
import that answered a missing die with 8 and an empty roster with "a weapon
called Rifles"). Everything now ships at zero — visibly unentered rather than
plausibly wrong.

**3. The refusal has to have no fallback, and a test has to prove it.** The die
size became a world setting shipped at `0`, and `requireDieSize()` throws rather
than returning a plausible number. `settings.test.ts` asserts the registered
default is `0`, that `requireDieSize` throws for unset and nonsense values, and —
bluntly — that `constants.ts` exports no number but the unset sentinel. That
last test is the one that stops the strip being undone by a single
`export const SOMETHING = 10` landing back in the file, which is how the numbers
got there the first time.

Result: 89 tests passing in the module (was 77), 1,570 across the monorepo,
`tsc --noEmit` clean.

## What the second migration added

`battleframe-greathelm` confirmed all three lessons above and added two.

**4. A shared test profile has to be deliberately wrong.** The helper installs
an invented ruleset whose face-to-action mapping is the *inverse* of the
published one. That immediately failed 28 tests which had quietly depended on
"face 6 is the big move" — none of which were about the mapping. Behavioural
tests that script exact dice now run against a second, conventional invented
profile declared as their own scenario; the one test that actually pins where
the mapping comes from runs against the inverted one. Keeping both apart is what
stops a scenario profile drifting back into being the rulebook.

**5. Exhaustiveness guards are allies here.** `pool-panel.ts` keys its
translation lookups by a `Record<IllegalTargetReason, string>`, so adding a new
reason broke the build until a string existed for it. That is the shape worth
copying into full-thrust: make the type system demand a decision wherever a
stripped value used to be assumed.

Result: 193 tests passing in the module, 1,584 across the monorepo,
`tsc --noEmit` clean.

## Plan

Work from the small end, so each module lands complete and the build stays green
rather than one large module sitting half-migrated.

1. ~~**`battleframe-incountry`**~~ — done 2026-09-21. `INX_DIE_SIZE` → a world
   setting shipped unset; `ARMOR_MODIFIER` and `ARMOR_DICE_DEFAULT` → the
   `armorModifier` and `armorDice` fields the user fills in;
   `INJURY_DAMAGE_THRESHOLD` → deleted, nothing imported it.
2. ~~**`battleframe-simple-skirmish`**~~ — done 2026-09-21, and it was neither a
   strip nor an attribution gap: the attribution was already correct, and the
   defect was that the repository's MIT `LICENSE` covered a CC BY-NC package
   while granting the right to sell it. Carve-out added to `LICENSE` and README.
3. ~~**`battleframe-greathelm`**~~ — done 2026-09-21. All twelve numbers plus
   the face-to-action table and the clash-action list moved to a world rules
   profile (`rules-profile.ts`) with a JSON importer and a blank template.
   `OPENING_DICE_POOL_SIZE` was deleted: like InCountry's injury threshold, it
   had no caller. The six action ids and six die faces stayed, per the owner's
   ruling that the strip is numbers only — those are the shape of the game the
   module implements, not values it asserts.
4. ~~**`battleframe-full-thrust`**~~ — done 2026-09-21. 26 constants were dead
   and deleted outright (every points and MASS value among them); the remaining
   110 moved to a flat world rules profile with a JSON importer and a blank
   template. `constants.ts` went 696 → 109 lines and now holds only the module
   id, the Actor subtypes, six document flag keys and the three vocabularies the
   types are built from (fire arcs, weapon kinds, hull grades).

Each step: move the values to user-supplied data, leave the mechanism behind,
keep a test proving an unpopulated profile does not silently fall back to the
stripped numbers. That last part is the one that matters — a default that
restores the published value puts the number back in the repository.

## What the largest migration added

`battleframe-full-thrust` was the big one — 147 constants, 64 source files,
10,632 lines — and it went more cleanly than the two small ones, for reasons
worth recording.

**6. Count the dead ones first.** 26 of the 147 constants had no caller
anywhere: `NOVA_CANNON_POINTS`, `WAVE_GUN_MASS`, every Savasku pod cost,
`PDS_RANGE_MU`, `DIE_MISS_MAX` and more. **Every points and MASS value in the
module was among them** — the most legally-loaded content in the file was also
the most obviously removable. Deleting them was a 20-minute change with zero
behaviour risk and it cut the real work by a fifth. Do this before designing
anything.

**7. A flat profile keyed by the old constant names makes the migration
mechanical.** 350 references were rewritten by script from `CONST_NAME` to
`requireRules().constName`, and the whole thing typechecked with **two** errors —
both the same cause, a `keyof typeof` over a table that had become a runtime
value. Resisting the urge to reorganise 110 values into a tidy taxonomy is what
made it a script rather than a fortnight.

**8. The type system finds the vocabulary you missed.** Those two errors were
how `HULL_GRADES` was identified as vocabulary rather than data: the grade
*names* had only ever existed as keys of the percentage table, so stripping the
table deleted the type. Names belong in `constants.ts`; the percentages went to
the profile.

**9. Memoize the profile read.** `requireRules()` sits inside per-die loops.
It caches on the identity of the stored setting value, which Foundry keeps
stable until a write, so the 110-field normalise runs once rather than per die.

**10. Tests that stub `game` wholesale will drop the world.** Four call sites did
`vi.stubGlobal("game", { user: { isGM: true } })`, silently discarding the
settings stub carrying the profile. They now spread the installed world. This is
the same class of problem as lesson 1 — the suite quietly not testing what it
appears to.

Result: `constants.ts` 696 → 109 lines, 644 module tests unchanged plus 18 new
guard tests, 1,602 across the monorepo, `tsc --noEmit` clean.

## Open question for the owner

Stripping `full-thrust` means the module does nothing out of the box until the
user types ~140 numbers in. Dirtside and StarGrunt already accept that trade;
Full Thrust is much larger, so the entry cost is much higher. If that is too
steep, the alternative is a documented **import format** plus a blank template —
the user still supplies the data, but once, as a file, rather than field by
field. Worth settling before step 4 rather than during it.

# Rules-content audit

What each package ships against the repository's stated policy — *the code
implements mechanics; the data is yours to bring* — and the plan for the four
packages that do not meet it.

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
| `battleframe-simple-skirmish` | 9 | **7** | *Simple Fantasy Skirmish*, Peter Vodden (CC BY-NC 4.0) | ⬜ to strip — see note |
| `battleframe-greathelm` | 20 | **~17** | `GREATHELM-QSR.pdf` v0.4, Malev | ⬜ to strip |
| `battleframe-full-thrust` | 147 | **~140** | Full Thrust 2e + More Thrust, Jon Tuffley / Ground Zero Games | ⬜ to strip — the large one |

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

### `battleframe-simple-skirmish` — the one that may not need stripping

*Simple Fantasy Skirmish* is **CC BY-NC 4.0**, and the file attributes it. That
is a licence to reuse, so this module is not in the same position as the other
three. Two things still need deciding, and neither is mine to decide:

1. **NC.** The licence forbids commercial use. That binds anyone who ships this
   module, and it should be stated in the module's own README, not only in a
   source comment.
2. **Attribution placement.** BY requires attribution visible to users, not a
   code comment they never open.

Recommended: **keep the numbers, fix the paperwork.** Stripping licensed,
attributed content buys nothing. Listed as "to strip" above only so it is not
mistaken for compliant without a decision.

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

## Plan

Work from the small end, so each module lands complete and the build stays green
rather than one large module sitting half-migrated.

1. ~~**`battleframe-incountry`**~~ — done 2026-09-21. `INX_DIE_SIZE` → a world
   setting shipped unset; `ARMOR_MODIFIER` and `ARMOR_DICE_DEFAULT` → the
   `armorModifier` and `armorDice` fields the user fills in;
   `INJURY_DAMAGE_THRESHOLD` → deleted, nothing imported it.
2. **`battleframe-simple-skirmish`** — decide the licence question first; if it
   stands, this becomes a README and attribution change only.
3. **`battleframe-greathelm`** — ~17 values. Note the file already flags them as
   provisional against a pre-1.0 quickstart.
4. **`battleframe-full-thrust`** — ~140 values across 48 importing files. Needs a
   user-populated rules profile rather than 140 separate data-model fields,
   mirroring ForceSignal's `RulesProfile.Empty` and Dirtside's
   "all values USER-entered" data models. Ship it **blank**.

Each step: move the values to user-supplied data, leave the mechanism behind,
keep a test proving an unpopulated profile does not silently fall back to the
stripped numbers. That last part is the one that matters — a default that
restores the published value puts the number back in the repository.

## Open question for the owner

Stripping `full-thrust` means the module does nothing out of the box until the
user types ~140 numbers in. Dirtside and StarGrunt already accept that trade;
Full Thrust is much larger, so the entry cost is much higher. If that is too
steep, the alternative is a documented **import format** plus a blank template —
the user still supplies the data, but once, as a file, rather than field by
field. Worth settling before step 4 rather than during it.

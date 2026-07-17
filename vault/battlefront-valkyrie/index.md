---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.fatdragongames.com/fdgfiles/battlefront-valkyrie-fdg0400/
confidence: confirmed
---

# Battlefront Valkyrie — Research Index

Research notes on **Battlefront Valkyrie™** (Fat Dragon Games), a 3D-printable spaceship fleet combat wargame. Compiled to inform a game engine architecture.

**Rules version basis: v4.5, with v5.6 pending changes noted where known.**

> [!warning] The free 14-page rulebook was never read.
> Storefronts blocked automated download (HTTP 403). Every note here is built from the publisher's FAQ, product pages, community reviews, and a community fleet builder. **A human downloading the free PDF closes most open gaps in one step** — see [[research-gaps-and-how-to-close-them]].

## Identification
- [[game-identity]] — What the game is, who publishes it, and why it's a *fleet* game rather than an infantry skirmish game.
- [[rejected-candidates]] — The other five Fat Dragon wargames and why each was ruled out.

## Turn structure (most important)
- [[round-structure]] — Four phases: Command → Movement → Combat → Repair. Phase-major, not activation-major.
- [[initiative-via-sensor-roll]] — Initiative is re-rolled every round via a sensor roll; the mechanic itself is undocumented.
- [[movement-alternating-half-all-half]] — The signature rule: winner moves half, loser moves all, winner moves the rest.
- [[combat-igo-ugo-one-ship-at-a-time]] — Strict 1:1 alternation, whole ship's weapons at a time — a *different* ordering algorithm than movement uses.
- [[repair-phase]] — Ships attempt to restore hull and engine at round's end; the "attempt" implies a roll nobody documented.
- [[action-economy-is-not-activation-based]] — There is no activation; the real currency is Reserve Power cubes.

## Core resolution
- [[reserve-power-allocation]] — Per-round cubes derived from Engine, spent on ship-card ability boxes.
- [[attack-roll-resolution]] — d6 pool, hit on 4+, fixed target number, no opposed roll.
- [[hit-location-hull-vs-engine]] — The same die that hits also picks the location: 4–5 hull, 6 engine.
- [[shield-dice-defense]] — Per-arc save roll blocking on 5+, hull damage blocked before engine.
- [[range-bands-and-dice-modifiers]] — Range changes dice count (+1d6 short, −1d6 long), never the target number.
- [[firing-arcs]] — Facing is a first-class property; arcs govern both attack and defence.

## Damage model
- [[engine-damage-death-spiral]] — Engine is the load-bearing stat: it drives movement, power, *and* shields at once.
- [[drifting-and-voluntary-power-down]] — The only real status condition, and it's a turn-locked commitment.
- [[ship-explosion-chain-reaction]] — Death emits an area template that can cascade — a recursive, order-dependent event.

## Space and terrain
- [[measurement-in-inches]] — Free-form inches, no grid, no zones, but a hard map edge that kills drifters.
- [[asteroids]] — Terrain with size classes; medium/large ones destroy drifting ships.
- [[tractor-beams]] — §9.4 "Grabbed and Dragged"; the only confirmation that *turn rating* is a ship stat.
- [[additional-subsystems]] — Missiles, ramming, special gear et al.: confirmed to exist, mechanics unknown.

## Force construction
- [[fleet-construction-points]] — Points-based from a fixed catalogue; **no custom ship design exists**.
- [[factions]] — Terran, Cygnian, Kurgun — but whether they differ mechanically is unknown.
- [[drones-and-mines]] — Concrete point costs from the community fleet builder; effects undocumented.
- [[ship-card-is-the-state-container]] — The physical card is a complete entity state model; let it drive the schema.

## Scoring and persistence
- [[victory-conditions-annihilation-only]] — Confirmed negative: no objectives, no scoring, no scenarios. Kill everything.
- [[campaign-rules-not-found]] — No campaign system found; likely absent, but explicitly unproven.

## Meta
- [[rulebook-availability-and-versions]] — 14 pages, free, and versioned 1.6 → 4.5 → 5.6 in about a year.
- [[licensing-proprietary-no-srd]] — Free to download ≠ open licence. No SRD. Get legal review before shipping ship data.
- [[known-criticism-initiative-is-fiddly]] — Reviewers dislike the initiative and non-Newtonian movement; house rules already exist.
- [[research-gaps-and-how-to-close-them]] — Ranked list of every open question and the one action that closes most of them.

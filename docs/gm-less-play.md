---
date: 2026-07-22
audience: BattleFrame GMs, players, and ruleset-module authors
status: live-verified (single-client + two-player)
---

# GM-less play — player-driven round advancement

A BattleFrame game is **set up** by a GM but **played** by the players. Once a
table is running, the players advance the game themselves — no one has to stay in
the GM chair clicking "next round". This is built into the engine, so every
ruleset module gets it.

## How it works

1. Each player toggles a **"Ready to advance"** button (the hourglass tool at the
   front of the ruleset's scene controls).
2. When **every active non-GM player** is marked ready, a short **countdown**
   starts (default 5 seconds — see the setting below).
3. At the end of the countdown the **round advances automatically** — the ruleset
   does whatever "advance the round" means for it (Full Thrust clears movement
   plots, ends the fire phase, and flies any in-flight missiles; the other rulesets
   roll initiative and open the next round), and the ready flags reset for the new
   round.
4. Any player **un-readying** (toggling the button off) **cancels** the pending
   countdown — the round waits until everyone is ready again.

The advance happens exactly **once**, no matter how many players are connected: the
clients agree on a single deterministic "host" (the smallest active-participant id)
who runs the countdown and performs the advance; the ready state lives on a synced
Document so every client sees the same flags.

## Setting: the countdown length

A world setting, **"Turn-advance countdown (seconds)"** (default **5**), controls
how long the countdown runs after everyone is ready. Set it to `0` for an instant
advance, or longer to give players a beat to un-ready if someone wasn't done.

Find it under *Game Settings → Configure Settings → System Settings*.

## Setup requirement — permissions

**This is the GM's one-time setup, and it matters.** The round advance runs on a
*player's* client (the host), and advancing the round updates shared documents
(the Scene, the Combat, ships/units). By default Foundry reserves those updates for
a Gamemaster, so a plain Player-role account cannot perform the advance. There are
two ways to satisfy that, in order of preference:

### Preferred: socketlib (a GM is present, plain players drive)

Install the free **[socketlib](https://foundryvtt.com/packages/socketlib)** module
(BattleFrame recommends it in its manifest, so Foundry offers to install it
alongside the system). When socketlib is active **and at least one GM is
connected**, the host player hands the privileged write to that GM over a socket
(`executeAsGM`) — so the players can be plain **Player**-role accounts and still
run the whole game. The GM only has to be *logged in*; they never touch the
controls. This is the recommended setup for a table where a GM is around but not
running the game.

### Fallback: Assistant-GM players (no GM needs to be present at all)

Without socketlib — or with no GM connected — the host performs the write itself,
which requires the host to have permission:

- **Simplest:** set each playing account to the **Assistant Gamemaster** role
  (*Configure Players → Role*). Assistant GMs can update the round/scene documents,
  so the host player can advance the round with **no full GM connected at all** —
  the truly GM-absent table. The GM builds the world, then hands the players
  Assistant-GM accounts to play.
- **Or:** grant the players ownership of the relevant Scene / Actors so they can
  update them. (More granular, more fiddly — Assistant GM is usually enough.)

The engine degrades gracefully between the two: it delegates through socketlib when
it can, and runs locally otherwise. If the players are plain Players, socketlib is
absent, and no GM is connected, the ready check + countdown still run but the
advance silently fails to take effect (no one can write the update). If advancement
seems to "stick", check that either socketlib + a GM is present, or the players hold
Assistant-GM/ownership.

> The engine treats Assistant GMs as participants when no plain-Player account is
> active, so two Assistant-GM players readying will advance the round between them
> with no full GM connected.

## Verified

The mechanism is live-verified in a real Foundry v14 world:

- **Single client:** Full Thrust — ready → countdown → the turn advanced (plots
  cleared, missiles flown) → ready flags cleared.
- **Two players, no GM connected:** two Assistant-GM players each joined a shared
  scene; Player A readied (`allReady: false`, waiting), Player B readied
  (`allReady: true`); after the countdown, **both** clients saw the ready flags
  cleared — the host advanced the round and the cleared state synced to both
  sessions.

The **socketlib delegation path** (plain-player host → `executeAsGM` → connected
GM performs the write) is implemented and unit-covered but **not yet live-verified**
— verifying it needs a three-seat world (two plain players + one idle GM) with
socketlib installed.

## For ruleset-module authors

The engine exposes the mechanism at `game.battleframe.advance`:

```ts
game.battleframe.advance.registerAdvance(fn)  // register YOUR "advance the round" (call once, at init)
game.battleframe.advance.toggleReady()        // toggle the current user's ready flag
game.battleframe.advance.isReady(userId?)     // is a user ready?
game.battleframe.advance.status()             // { ready, participants, allReady } — for a UI
```

To wire a module (see any of the four shipped rulesets for the pattern):

1. At `init`, register your round-advance callback — an **ungated** version of your
   "next round" action (no `isGM()` gate, since the host running it is a trusted
   player in GM-less play):
   `game.battleframe.advance.registerAdvance(() => advanceRoundCore())`.
2. Add a player-visible **"Ready"** toggle scene tool whose `onChange` calls
   `game.battleframe.advance.toggleReady()` and whose `active` reflects
   `isReady()`. Make sure the tool is reachable by players (its scene-control group
   must be visible to non-GMs; keep any GM-only tools individually gated).

The engine owns the neutral plumbing — ready state, all-ready detection, host
election, the countdown, and the timer setting. Your module owns only *what*
advancing the round does.

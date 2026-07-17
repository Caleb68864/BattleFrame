import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_INITIATIVE_TIE_REROLLS,
  InitiativeTieUnresolvedError,
  WrongSideCountError,
  addRoundSceneControl,
  beginRoundFromControl,
  determineInitiativeWithRerolls,
  findDefenderInBaseContact,
  formatInches,
  onRoundControlActivated,
  planMovement,
  resetBattleFromControl,
  resolveFirstPlayer,
  rollPool,
  sideFromDisposition,
  type CombatDocumentLike,
  type RoundKnight,
} from "../src/ui/round-control";
import { SPRINT_MOVE_INCHES } from "../src/constants";
import type { ResolvedDie } from "../src/round/loop";
import type { RoundSession } from "../src/round/session";
import type { DiceApiLike, MeasureApiLike } from "../src/combat/clash";

/**
 * Drives a session to completion by spending every offerable die on the
 * first knight the session reports as a legal target -- these tests care
 * about initiative, movement notification, and persistence, not which
 * knight gets which die (that "who chooses" behaviour is session.test.ts's
 * job, headless, and pool-panel.test.ts's for the click-through). A die
 * with no legal target is discarded rather than deadlocking the round (see
 * round/session.ts's own discardDie -- exactly the "side runs out" edge
 * case in the master spec's Edge Cases table).
 */
async function playToCompletion(session: RoundSession): Promise<void> {
  while (!session.isComplete()) {
    const dice = session.remainingDice();
    const active = session.activePlayerId();
    const die = dice.find((candidate) => candidate.playerId === active);

    if (!die) {
      return;
    }

    const targets = session.legalTargetsFor(die.id).filter((target) => target.legal);

    if (targets.length === 0) {
      await session.discardDie(die.id, "no legal target");
      continue;
    }

    await session.spendDie(die.id, targets[0].knightId);
  }
}

/**
 * A dice API that reads faces from a script, so a round is deterministic
 * without Math.random() anywhere near it. Runs off the end by repeating the
 * last face -- the tail of a script is the courage phase, whose length
 * depends on how the battle phase went.
 */
function scriptedDice(faces: readonly number[]): DiceApiLike & { calls: number } {
  const api = {
    calls: 0,
    async roll() {
      const face = faces[Math.min(api.calls, faces.length - 1)];
      api.calls += 1;

      return { total: face };
    },
  };

  return api;
}

interface PositionedToken {
  /** Position along a line, in inches. */
  inches: number;
}

/**
 * Stands in for game.battleframe.measure. Returns the base-to-base gap
 * directly (the real service subtracts both base radii from the centre
 * distance -- see packages/battleframe/src/measurement/measure.ts), so 0 here
 * means the same thing it means there: bases touching.
 */
function lineMeasure(): MeasureApiLike & { calls: number } {
  const api = {
    calls: 0,
    between(tokenA: unknown, tokenB: unknown) {
      api.calls += 1;

      return {
        distance: Math.abs(
          (tokenA as PositionedToken).inches - (tokenB as PositionedToken).inches
        ),
      };
    },
  };

  return api;
}

interface FakeActor {
  system: { damage: number };
  update: (data: Record<string, unknown>) => Promise<unknown>;
  updates: number;
}

function fakeActor(damage = 0): FakeActor {
  const actor: FakeActor = {
    system: { damage },
    updates: 0,
    async update(data: Record<string, unknown>) {
      actor.system.damage = data["system.damage"] as number;
      actor.updates += 1;

      return undefined;
    },
  };

  return actor;
}

function knight(id: string, playerId: string, inches: number, actor = fakeActor()): RoundKnight {
  return { id, playerId, name: id, actor, token: { inches } };
}

function fakeCombat(): CombatDocumentLike & { flagWrites: Array<[string, string, unknown]> } {
  const combat = {
    flagWrites: [] as Array<[string, string, unknown]>,
    async setFlag(scope: string, key: string, value: unknown) {
      combat.flagWrites.push([scope, key, value]);

      return undefined;
    },
  };

  return combat;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rollPool", () => {
  it("rolls one 1d6 per die through the shared dice API, so faces survive", async () => {
    const dice = scriptedDice([6, 5, 4]);

    const pool = await rollPool(dice, 3, "a");

    expect(pool).toEqual([{ face: 6 }, { face: 5 }, { face: 4 }]);
    expect(dice.calls).toBe(3);
  });
});

describe("determineInitiativeWithRerolls -- the invented tie re-roll", () => {
  it("re-rolls an exact tie and reports how many re-rolls it took", async () => {
    // Attempt 1: both [6,6] -- equal counts at every face, the exact tie the
    // QSR never covers. Attempt 2: a [6,6] vs b [1,1] -- a holds the only 6s.
    const dice = scriptedDice([6, 6, 6, 6, 6, 6, 1, 1]);

    const initiative = await determineInitiativeWithRerolls(dice, "a", 2, "b", 2);

    expect(initiative.outcome).toEqual({ result: "forced-first", playerId: "a" });
    expect(initiative.rerolls).toBe(1);
    // Both pools are re-rolled, not just the loser's: 2 attempts x 4 dice.
    expect(dice.calls).toBe(8);
    expect(initiative.pools.get("b")).toEqual([{ face: 1 }, { face: 1 }]);
  });

  it("consumes the tie outcome rather than leaking it to the caller", async () => {
    const dice = scriptedDice([6, 6, 6, 6, 5, 5, 4, 4]);

    const initiative = await determineInitiativeWithRerolls(dice, "a", 2, "b", 2);

    expect(initiative.outcome.result).not.toBe("tie");
  });

  it("bounds the re-roll: a pathological tie throws instead of looping forever", async () => {
    // Every roll is a 6, so every attempt ties, forever.
    const dice = scriptedDice([6]);

    await expect(determineInitiativeWithRerolls(dice, "a", 2, "b", 2)).rejects.toBeInstanceOf(
      InitiativeTieUnresolvedError
    );
    // Bounded: (MAX + 1) attempts x 4 dice, and then it stops.
    expect(dice.calls).toBe((MAX_INITIATIVE_TIE_REROLLS + 1) * 4);
  });
});

describe("resolveFirstPlayer", () => {
  it("honours forced-first as a rule -- the sole holder of 6s gets no choice", () => {
    const first = resolveFirstPlayer(
      { result: "forced-first", playerId: "a" },
      ["a", "b"],
      "second"
    );

    expect(first).toBe("a");
  });

  it("lets the winner of a 'choose' outcome elect to go second", () => {
    expect(resolveFirstPlayer({ result: "choose", playerId: "a" }, ["a", "b"], "second")).toBe("b");
    expect(resolveFirstPlayer({ result: "choose", playerId: "a" }, ["a", "b"], "first")).toBe("a");
  });

  it("refuses to pick a first player from a tie", () => {
    expect(() => resolveFirstPlayer({ result: "tie" }, ["a", "b"])).toThrow(
      InitiativeTieUnresolvedError
    );
  });
});

describe("formatInches -- presentation only", () => {
  it("rounds the float that reached the live notification bar", () => {
    // Verbatim from a live round: `sprint up to 0.0001574803149606563"`. That
    // is the base-to-base gap of two TOUCHING knights (see
    // tests/base-contact.test.ts) -- unreadable, and now shown as 0".
    expect(formatInches(0.0001574803149606563)).toBe("0");
  });

  it("leaves whole GREATHELM distances alone", () => {
    expect(formatInches(5)).toBe("5");
    expect(formatInches(SPRINT_MOVE_INCHES)).toBe("5");
    expect(formatInches(2.5)).toBe("2.5");
  });

  it("keeps two places -- finer than a GM can place a model", () => {
    expect(formatInches(3.14159)).toBe("3.14");
    expect(formatInches(1.006)).toBe("1.01");
    expect(formatInches(4.999)).toBe("5");
    // No half-up guarantee is claimed at the 3rd decimal: 1.005 is really
    // 1.00499...  in binary and formats as "1". Irrelevant at this scale --
    // this is a label, and the rules never read it back.
  });

  it("does not round the maths behind it", () => {
    // planMovement still reports the full-precision number; only the string
    // the player sees is rounded.
    const measure = lineMeasure();
    const mover = knight("kA", "a", 0);
    const plan = planMovement(
      { id: "d1", playerId: "a", knightId: "kA", face: 6, action: "sprint" },
      mover,
      [mover, knight("kB", "b", 0.0001574803149606563)],
      measure
    );

    expect(plan?.moveInches).toBe(0.0001574803149606563);
  });
});

describe("planMovement -- Sprint is measured and capped at 5\"", () => {
  const sprintDie: ResolvedDie = {
    id: "d1",
    playerId: "a",
    knightId: "kA",
    face: 6,
    action: "sprint",
  };

  it("caps a Sprint at SPRINT_MOVE_INCHES when the enemy is further away", () => {
    const measure = lineMeasure();
    const mover = knight("kA", "a", 0);
    const knights = [mover, knight("kB", "b", 9)];

    const plan = planMovement(sprintDie, mover, knights, measure);

    expect(plan?.allowanceInches).toBe(SPRINT_MOVE_INCHES);
    expect(plan?.allowanceInches).toBe(5);
    expect(plan?.distanceToNearestEnemyInches).toBe(9);
    expect(plan?.moveInches).toBe(5);
    // The cap came from a real base-to-base measurement, not from arithmetic
    // on a hard-coded position.
    expect(measure.calls).toBeGreaterThan(0);
  });

  it("stops at base contact rather than measuring through the enemy", () => {
    const measure = lineMeasure();
    const mover = knight("kA", "a", 0);
    const knights = [mover, knight("kB", "b", 2)];

    expect(planMovement(sprintDie, mover, knights, measure)?.moveInches).toBe(2);
  });

  it("uses each face's own allowance -- Encircle 3\", Shift 1\"", () => {
    const measure = lineMeasure();
    const mover = knight("kA", "a", 0);
    const knights = [mover, knight("kB", "b", 9)];

    const encircle = planMovement(
      { ...sprintDie, face: 5, action: "encircle" },
      mover,
      knights,
      measure
    );
    const shift = planMovement({ ...sprintDie, face: 3, action: "shift" }, mover, knights, measure);

    expect(encircle?.moveInches).toBe(3);
    expect(shift?.moveInches).toBe(1);
  });

  it("returns no movement plan for a clash face", () => {
    const measure = lineMeasure();
    const mover = knight("kA", "a", 0);

    expect(
      planMovement({ ...sprintDie, face: 1, action: "heavy" }, mover, [mover], measure)
    ).toBeNull();
  });
});

describe("findDefenderInBaseContact", () => {
  it("finds an enemy at distance 0 and ignores one merely nearby", () => {
    const measure = lineMeasure();
    const attacker = knight("kA", "a", 0);

    expect(
      findDefenderInBaseContact(attacker, [attacker, knight("kB", "b", 0)], measure)?.id
    ).toBe("kB");
    expect(
      findDefenderInBaseContact(attacker, [attacker, knight("kB", "b", 0.5)], measure)
    ).toBeUndefined();
  });

  it("never targets an ally standing in contact", () => {
    const measure = lineMeasure();
    const attacker = knight("kA1", "a", 0);

    expect(
      findDefenderInBaseContact(attacker, [attacker, knight("kA2", "a", 0)], measure)
    ).toBeUndefined();
  });
});

describe("beginRoundFromControl -- initiative and a session the panel drives, not an auto-battler", () => {
  it("gathers, rolls pools of knights+1, takes initiative, and hands back a session that resolves 6->1, runs courage, and persists order once played out", async () => {
    const measure = lineMeasure();
    const actorA = fakeActor();
    const actorB = fakeActor();
    const knightA = knight("kA", "a", 0, actorA);
    const knightB = knight("kB", "b", 0, actorB);
    const combat = fakeCombat();

    // 4 initiative dice: a [2,2] vs b [1,1]. No 6s/5s/4s/3s either side, so
    // the cascade reaches face 2, where a holds 2 and b holds 0 -> a chooses.
    // Then 8 clash rolls (attacker 6, defender 1 -> attacker always wins),
    // then the courage tests run off the end of the script as 6s (a pass).
    const dice = scriptedDice([2, 2, 1, 1, 6, 1, 6, 1, 6, 1, 6, 1, 6]);

    const { session, firstPlayerId, tieRerolls, poolSizes } = await beginRoundFromControl({
      knights: [knightA, knightB],
      combat,
      dice,
      measure,
    });

    // Pool = knights in play + 1 (QSR p1), one knight a side.
    expect([...poolSizes.values()]).toEqual([2, 2]);
    expect(firstPlayerId).toBe("a");
    expect(tieRerolls).toBe(0);

    // Nothing has been spent yet -- the auto-battler resolved the whole
    // round synchronously; a session instead waits to be played.
    expect(session.remainingDice()).toHaveLength(4);
    expect(combat.flagWrites).toEqual([]);

    await playToCompletion(session);

    // Wounds reached the Actor documents -- resolveDieAction/applyClashDamage
    // are actually on the path, and damage caps at 3.
    expect(actorB.system.damage).toBe(2);
    expect(actorA.system.damage).toBe(3);
    expect(actorA.updates).toBeGreaterThan(0);

    // The courage phase ran after every die was spent (a defined, empty Map,
    // not undefined). Nobody tested: kA reached the damage limit and was
    // immediately removed (QSR p2), and kB's only enemy was that removed
    // kA -- with no living enemy left in contact, kB has nothing to test
    // against either (round/session.ts's isRemoved is live, not cached).
    expect(session.courageOutcomes()).toBeDefined();
    expect([...(session.courageOutcomes()?.keys() ?? [])]).toEqual([]);

    // Order persisted through the document's own setFlag, once the session
    // completed -- not up front, and not by mutating a plain flags object.
    expect(combat.flagWrites).toEqual([
      ["battleframe", "order", ["kA", "kA", "kB", "kB"]],
    ]);
  });

  it("counts only knights in play toward the pool -- a removed knight does not inflate it", async () => {
    // QSR p1 (confirmed): pool = knights in the play area + 1, and it "shrinks
    // as your knights die" -- the deliberate death-spiral. A knight removed by
    // damage keeps its token on the canvas, so it must be excluded from the pool
    // count, not merely from activation. Same family as the courage-difficulty
    // bug: a "knights in play" number that quietly counts the dead.
    const knights = [
      knight("kA1", "a", 0),                // in play
      knight("kA2", "a", 0, fakeActor(3)),  // removed (damage 3); token still present
      knight("kB1", "b", 0),                // in play
    ];
    const { poolSizes } = await beginRoundFromControl({
      knights,
      combat: fakeCombat(),
      dice: scriptedDice([6, 5, 4, 3, 2, 1, 6, 5]),
      measure: lineMeasure(),
    });

    // a has one knight in play -> pool 2, not 3.
    expect(poolSizes.get("a")).toBe(2);
    expect(poolSizes.get("b")).toBe(2);
  });

  it("persists the order via combat.setFlag exactly once, only after the session completes", async () => {
    const measure = lineMeasure();
    const combat = fakeCombat();
    const setFlag = vi.spyOn(combat, "setFlag");

    const { session } = await beginRoundFromControl({
      knights: [knight("kA", "a", 0), knight("kB", "b", 9)],
      combat,
      dice: scriptedDice([6, 6, 5, 5, 6]),
      measure,
    });

    expect(setFlag).not.toHaveBeenCalled();

    await playToCompletion(session);

    expect(setFlag).toHaveBeenCalledTimes(1);
    expect(setFlag).toHaveBeenCalledWith("battleframe", "order", expect.any(Array));
  });

  it("measures and caps a Sprint during a real round, notifying the distance as each die is spent", async () => {
    const measure = lineMeasure();
    // a rolls [6,6] (Sprint), b rolls [5,5] -- a holds the only 6s, forced first.
    const dice = scriptedDice([6, 6, 5, 5, 6]);
    const notes: string[] = [];

    const { session, firstPlayerId } = await beginRoundFromControl({
      knights: [knight("kA", "a", 0), knight("kB", "b", 9)],
      combat: fakeCombat(),
      dice,
      measure,
      notify: (message) => notes.push(message),
    });

    expect(firstPlayerId).toBe("a");

    await playToCompletion(session);

    const sprintNotes = notes.filter((note) => note.includes("sprint up to"));
    expect(sprintNotes).toHaveLength(2);
    expect(sprintNotes.every((note) => note.includes('up to 5"'))).toBe(true);
  });

  it("lets a side discard a clash die with no enemy in base contact rather than resolving it at range", async () => {
    const measure = lineMeasure();
    const actorB = fakeActor();
    // a rolls [1,1] (Heavy) but the enemy is 9" away -- no legal spend.
    const dice = scriptedDice([1, 1, 3, 3, 6]);

    const { session } = await beginRoundFromControl({
      knights: [knight("kA", "a", 0), knight("kB", "b", 9, actorB)],
      combat: fakeCombat(),
      dice,
      measure,
    });

    await playToCompletion(session);

    expect(actorB.system.damage).toBe(0);
    expect(session.isComplete()).toBe(true);
  });

  it("applies the Kickstarter dice-pool floor only when the setting is on", async () => {
    const base = {
      knights: [knight("kA", "a", 0), knight("kB", "b", 9)],
      dice: scriptedDice([6, 6, 6, 5, 5, 5, 6]),
      measure: lineMeasure(),
    };

    const { poolSizes: flooredSizes } = await beginRoundFromControl({
      ...base,
      combat: fakeCombat(),
      minDicePoolFloorEnabled: true,
    });

    expect([...flooredSizes.values()]).toEqual([3, 3]);

    const { poolSizes: unflooredSizes } = await beginRoundFromControl({
      knights: base.knights,
      combat: fakeCombat(),
      dice: scriptedDice([6, 6, 5, 5, 6]),
      measure: lineMeasure(),
    });

    expect([...unflooredSizes.values()]).toEqual([2, 2]);
  });

  it("refuses to run without exactly two sides", async () => {
    await expect(
      beginRoundFromControl({
        knights: [knight("kA", "a", 0), knight("kA2", "a", 1)],
        combat: fakeCombat(),
        dice: scriptedDice([6]),
        measure: lineMeasure(),
      })
    ).rejects.toBeInstanceOf(WrongSideCountError);
  });
});

describe("sideFromDisposition", () => {
  it("splits the two forces on Foundry's own hostile/friendly disposition", () => {
    expect(sideFromDisposition(-1)).toBe("hostile");
    expect(sideFromDisposition(1)).toBe("friendly");
    expect(sideFromDisposition(undefined)).toBe("friendly");
  });
});

describe("the scene control is GM-only", () => {
  it("does not run a round for a player, and says why", async () => {
    const warn = vi.fn();
    vi.stubGlobal("game", { user: { isGM: false }, battleframe: {}, combat: {} });
    vi.stubGlobal("ui", { notifications: { warn } });

    const result = await onRoundControlActivated();

    expect(result).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("marks the control and its tool invisible to a player", () => {
    vi.stubGlobal("game", { user: { isGM: false } });
    const controls: Record<string, { visible?: boolean; tools?: unknown }> = {};

    addRoundSceneControl(controls);

    expect(controls["battleframe-greathelm"].visible).toBe(false);
  });

  it("shows the control to a GM", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Record<string, { visible?: boolean }> = {};

    addRoundSceneControl(controls);

    expect(controls["battleframe-greathelm"].visible).toBe(true);
  });
});

/**
 * The v14 payload shape for getSceneControlButtons is UNVERIFIED -- the vault
 * has no note on this hook at any confidence (see the comment on
 * addRoundSceneControl). These tests pin the tolerance to both known shapes;
 * they do NOT prove the hook works in v14. Only the SS-13 [HUMAN REVIEW]
 * criterion can do that.
 */
describe("addRoundSceneControl tolerates both known payload shapes", () => {
  it("appends to an array-shaped controls payload", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Array<{ name: string; tools: unknown }> = [];

    addRoundSceneControl(controls);

    expect(controls).toHaveLength(1);
    expect(controls[0].name).toBe("battleframe-greathelm");
    expect(Array.isArray(controls[0].tools)).toBe(true);
    // Both tools present: running a round and starting a new battle.
    const toolNames = (controls[0].tools as Array<{ name: string }>).map((t) => t.name);
    expect(toolNames).toEqual(["greathelm-run-round", "greathelm-new-battle"]);
  });

  it("keys into a record-shaped controls payload", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Record<string, { tools?: Record<string, unknown> }> = {};

    addRoundSceneControl(controls);

    expect(controls["battleframe-greathelm"].tools).toHaveProperty("greathelm-run-round");
    expect(controls["battleframe-greathelm"].tools).toHaveProperty("greathelm-new-battle");
  });

  it("does not throw on an unexpected payload", () => {
    vi.stubGlobal("game", { user: { isGM: true } });

    expect(() => addRoundSceneControl(undefined)).not.toThrow();
  });
});

/**
 * The "New Battle" reset is destructive -- it clears every knight's wounds,
 * momentum and flight. These tests pin the safety ordering: it is GM-gated, it
 * confirms BEFORE it touches an Actor, and a refused or absent confirmation
 * resets nothing. The reset payload itself is unit-tested in removal.test.ts
 * (resetKnight); here we prove the orchestrator never reaches it without
 * consent.
 */
describe("resetBattleFromControl -- confirm before you clear the board", () => {
  const KNIGHT_TYPE = "battleframe-greathelm.knight";

  function knightPlaceable(id: string) {
    const update = vi.fn(async () => undefined);
    return {
      id,
      name: id,
      center: { x: 0, y: 0 },
      scene: { grid: { size: 100, distance: 1, units: "in" } },
      document: { id, disposition: 1, flags: {}, width: 1, height: 1 },
      actor: { id, name: id, type: KNIGHT_TYPE, system: { damage: 0 }, flags: {}, update },
    };
  }

  function stubWorld(options: {
    isGM: boolean;
    placeables: ReturnType<typeof knightPlaceable>[];
    confirm?: "confirm" | "cancel" | "no-dialog";
  }) {
    const warn = vi.fn();
    const info = vi.fn();
    vi.stubGlobal("game", {
      user: { isGM: options.isGM },
      i18n: { localize: (k: string) => k, format: (k: string) => k },
    });
    vi.stubGlobal("ui", { notifications: { warn, info } });
    vi.stubGlobal("canvas", {
      tokens: { placeables: options.placeables },
      scene: { grid: { size: 100, distance: 1, units: "in" } },
    });

    if (options.confirm === "no-dialog") {
      vi.stubGlobal("foundry", undefined);
    } else if (options.confirm) {
      const wait = vi.fn().mockResolvedValue(options.confirm);
      vi.stubGlobal("foundry", { applications: { api: { DialogV2: { wait } } } });
    }

    return { warn, info };
  }

  it("refuses a non-GM: no Actor is touched, and it says why", async () => {
    const knights = [knightPlaceable("a")];
    const { warn } = stubWorld({ isGM: false, placeables: knights, confirm: "confirm" });

    const count = await resetBattleFromControl();

    expect(count).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(knights[0].actor.update).not.toHaveBeenCalled();
  });

  it("does nothing when the canvas holds no knights", async () => {
    const wait = vi.fn().mockResolvedValue("confirm");
    stubWorld({ isGM: true, placeables: [] });
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { wait } } } });

    const count = await resetBattleFromControl();

    expect(count).toBe(0);
    // Never even opened the confirmation: there was nothing to confirm.
    expect(wait).not.toHaveBeenCalled();
  });

  it("resets nothing when the GM cancels the confirmation", async () => {
    const knights = [knightPlaceable("a"), knightPlaceable("b")];
    stubWorld({ isGM: true, placeables: knights, confirm: "cancel" });

    const count = await resetBattleFromControl();

    expect(count).toBe(0);
    expect(knights[0].actor.update).not.toHaveBeenCalled();
    expect(knights[1].actor.update).not.toHaveBeenCalled();
  });

  it("resets nothing when no dialog API is available -- absence is not consent", async () => {
    const knights = [knightPlaceable("a")];
    stubWorld({ isGM: true, placeables: knights, confirm: "no-dialog" });

    const count = await resetBattleFromControl();

    expect(count).toBe(0);
    expect(knights[0].actor.update).not.toHaveBeenCalled();
  });

  it("resets every knight once the GM confirms, and reports the count", async () => {
    const knights = [knightPlaceable("a"), knightPlaceable("b")];
    stubWorld({ isGM: true, placeables: knights, confirm: "confirm" });

    const count = await resetBattleFromControl();

    expect(count).toBe(2);
    for (const knight of knights) {
      expect(knight.actor.update).toHaveBeenCalledWith({
        "system.damage": 0,
        "system.momentum": 0,
        "flags.battleframe-greathelm.-=fled": null,
      });
    }
  });
});

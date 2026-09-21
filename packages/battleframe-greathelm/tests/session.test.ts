import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRoundSession,
  IllegalDieSpendError,
  isPersistedRoundResumable,
  restoreRoundSession,
  type CreateRoundSessionOptions,
  type PoolDie,
  type RoundSessionKnight,
  type SerializedRoundSession,
} from "../src/round/session";
import type { ActorLike } from "../src/round/loop";
import type { DiceApiLike, MeasureApiLike } from "../src/combat/clash";
import type { DieFace } from "../src/constants";
import { SCENARIO_PROFILE, withScenarioProfile } from "./helpers/world";

// This module ships no rules numbers. Tests install a world carrying an
// invented profile, the way a user fills one in -- see helpers/world.ts.
let restoreGreathelmWorld: () => void;
beforeEach(() => {
  restoreGreathelmWorld = withScenarioProfile();
});
afterEach(() => {
  restoreGreathelmWorld();
});


function fixedDice(total = 6): DiceApiLike {
  return {
    async roll() {
      return { total };
    },
  };
}

function makeActor(initialDamage = 0): ActorLike & { system: { damage: number } } {
  const actor = {
    system: { damage: initialDamage },
    async update(data: Record<string, unknown>) {
      const next = data["system.damage"];
      if (typeof next === "number") {
        actor.system.damage = next;
      }
    },
  };
  return actor;
}

/** A measure that reports base contact for every declared adjacent pair, and 100" otherwise. */
function makeMeasure(adjacentPairs: ReadonlyArray<[string, string]>): MeasureApiLike {
  const idOf = (token: unknown): string => (token as { id: string }).id;
  const isAdjacent = (a: string, b: string): boolean =>
    adjacentPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  return {
    between(tokenA, tokenB) {
      const distance = isAdjacent(idOf(tokenA), idOf(tokenB)) ? 0 : 100;
      return { distance };
    },
  };
}

function knight(
  id: string,
  playerId: string,
  overrides: Partial<RoundSessionKnight> = {}
): RoundSessionKnight {
  return {
    id,
    playerId,
    actor: makeActor(),
    token: { id },
    ...overrides,
  };
}

function pool(...faces: DieFace[]): PoolDie[] {
  return faces.map((face) => ({ face }));
}

function baseOptions(
  knights: RoundSessionKnight[],
  pools: ReadonlyMap<string, readonly PoolDie[]>,
  firstPlayerId: string,
  dice: DiceApiLike = fixedDice(),
  measure: MeasureApiLike = makeMeasure([])
): CreateRoundSessionOptions {
  return { knights, pools, firstPlayerId, dice, measure };
}

describe("createRoundSession", () => {
  it("enforces 6->1: refuses a lower face while a higher unspent die remains", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(6, 3)],
      ["b", pool(2)],
    ]);
    const session = createRoundSession(baseOptions(knights, pools, "a"));

    // a-d1 is the face-6 die, a-d2 is face-3, b-d1 is face-2.
    await expect(session.spendDie("a-d2", "a1")).rejects.toThrow(IllegalDieSpendError);

    // The face-6 die is legal right away.
    await expect(session.spendDie("a-d1", "a1")).resolves.toBeUndefined();
  });

  it("serialize/restoreRoundSession round-trips an in-progress round (P0 reload survival)", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(6, 5)],
      ["b", pool(6)],
    ]);
    const dice = fixedDice();
    const measure = makeMeasure([]);
    const session = createRoundSession(baseOptions(knights, pools, "a", dice, measure));

    await session.spendDie("a-d1", "a1"); // a spends its 6 -> b's turn (the 6)
    expect(session.activePlayerId()).toBe("b");

    const state = session.serialize();
    expect(state.firstPlayerId).toBe("a");
    expect(state.complete).toBe(false);

    // Rebuilt from the persisted state, the round continues exactly where it
    // left off -- the spent die is gone, and it is still b's turn.
    const restored = restoreRoundSession({ knights, dice, measure }, state);
    expect(restored.activePlayerId()).toBe("b");
    expect(restored.remainingDice().map((die) => die.id).sort()).toEqual(
      session.remainingDice().map((die) => die.id).sort()
    );
  });

  it("tolerates a malformed persisted round (missing/invalid unspent) instead of throwing", () => {
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const dice = fixedDice();
    const measure = makeMeasure([]);

    // A round flag is untyped JSON persisted on the Combat document -- it must
    // survive a reload AND a module version change. A flag written by an older
    // build (or partially written) can arrive with `unspent` absent. Restoring
    // it must degrade to an empty round, never throw: the resume path in
    // ui/round-control.ts runs this on every "Run Round" click, and a throw
    // there bricks the round tool permanently (the flag is non-complete, so the
    // glue re-enters resume every time and can never start a fresh round).
    const malformed = {
      firstPlayerId: "a",
      turnPointer: 0,
      complete: false,
    } as unknown as import("../src/round/session").SerializedRoundSession;

    expect(() => restoreRoundSession({ knights, dice, measure }, malformed)).not.toThrow();
    const restored = restoreRoundSession({ knights, dice, measure }, malformed);
    expect(restored.remainingDice()).toEqual([]);

    // A player entry that is not an array (another partial-write shape) is
    // likewise coerced rather than dereferenced with `.map`.
    const malformedPool = {
      firstPlayerId: "a",
      turnPointer: 0,
      complete: false,
      unspent: { a: null, b: [{ id: "b-d1", playerId: "b", face: 6 }] },
    } as unknown as import("../src/round/session").SerializedRoundSession;

    expect(() => restoreRoundSession({ knights, dice, measure }, malformedPool)).not.toThrow();
    const restoredPool = restoreRoundSession({ knights, dice, measure }, malformedPool);
    expect(restoredPool.remainingDice().map((die) => die.id)).toEqual(["b-d1"]);
  });

  it("reports whether a persisted round can still be played against the current knights", () => {
    // The resume branch of advanceRoundCore reopens the pool panel on the
    // persisted round whenever the flag is non-complete. If the side whose round
    // this is (firstPlayerId) had its every token deleted between sessions, the
    // panel reopens on a round that can never be played to completion -- and,
    // because the glue re-enters resume on every "Run Round" click, that stale
    // flag permanently bricks the round tool. The glue guards with this predicate
    // and starts a FRESH round when it returns false, rather than resume forever.
    const state: SerializedRoundSession = {
      firstPlayerId: "a",
      turnPointer: 0,
      complete: false,
      unspent: {
        a: [{ id: "a-d1", playerId: "a", face: 6 }],
        b: [{ id: "b-d1", playerId: "b", face: 5 }],
      },
    };

    // Both sides still on the canvas -> resumable, and behaviour is unchanged.
    expect(isPersistedRoundResumable(state, ["a", "b"])).toBe(true);
    // Side "a" (the round's first player) was wiped from the canvas -> stale.
    expect(isPersistedRoundResumable(state, ["b"])).toBe(false);
    // No knights at all (empty canvas) -> stale.
    expect(isPersistedRoundResumable(state, [])).toBe(false);
  });

  it("alternates sides, and lets one side continue after the other runs out", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(6, 5)],
      ["b", pool(6)],
    ]);
    const session = createRoundSession(baseOptions(knights, pools, "a"));

    expect(session.activePlayerId()).toBe("a");
    await session.spendDie("a-d1", "a1");

    expect(session.activePlayerId()).toBe("b");
    await session.spendDie("b-d1", "b1");

    // b is out of dice; a continues uninterrupted at face 5.
    expect(session.activePlayerId()).toBe("a");
    await session.spendDie("a-d2", "a1");

    expect(session.remainingDice()).toEqual([]);
  });

  it("carries alternation across a step boundary -- a new step does not restart with the winner", async () => {
    // The QSR is ambiguous here: "starting with whoever goes first, players
    // alternate ... working through the current step before the next". This
    // pins the *continuous* reading the session implements: alternation runs
    // unbroken across the whole phase, it is NOT reset to the initiative winner
    // at each step. a wins initiative and holds two 6s to b's one, so after the
    // three 6s alternate a, b, a, the pointer sits on b -- and b, the loser,
    // opens the 5s. (An earlier, deleted implementation restarted each step
    // with the winner; this test is what would catch a silent revert to that.)
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(6, 6, 5)],
      ["b", pool(6, 5)],
    ]);
    const session = createRoundSession(baseOptions(knights, pools, "a"));

    expect(session.activePlayerId()).toBe("a");
    await session.spendDie("a-d1", "a1"); // face 6
    expect(session.activePlayerId()).toBe("b");
    await session.spendDie("b-d1", "b1"); // face 6
    expect(session.activePlayerId()).toBe("a");
    await session.spendDie("a-d2", "a1"); // face 6, last of the step

    // Step drops to 5. Continuous alternation => b (the initiative loser) is up.
    expect(session.activePlayerId()).toBe("b");
  });

  it("exposes isOfferable as the single authority for the 6->1 + turn rule", async () => {
    // The pool panel must not re-derive playability; it asks the session. This
    // pins the predicate the panel delegates to, so panel and session cannot
    // drift into disagreeing about which die is playable.
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(6, 3)],
      ["b", pool(2)],
    ]);
    const session = createRoundSession(baseOptions(knights, pools, "a"));

    expect(session.isOfferable("a-d1")).toBe(true); // face 6, a's turn
    expect(session.isOfferable("a-d2")).toBe(false); // face 3, blocked by the unspent 6
    expect(session.isOfferable("b-d1")).toBe(false); // face 2, not the current step
    expect(session.isOfferable("no-such-die")).toBe(false);

    await session.spendDie("a-d1", "a1"); // spend the 6; step drops to 3 (a's)
    expect(session.isOfferable("a-d2")).toBe(true);
    expect(session.isOfferable("b-d1")).toBe(false);
  });

  it("throws on an illegal (die, knight) pair instead of silently no-opping", async () => {
    const knights = [knight("a1", "a"), knight("a2", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(6)],
      ["b", pool(6)],
    ]);
    const session = createRoundSession(baseOptions(knights, pools, "a"));

    // a-d1 belongs to player a; it may not activate player b's knight.
    await expect(session.spendDie("a-d1", "b1")).rejects.toThrow(IllegalDieSpendError);

    // a-d1 is legal for a1; b-d1 is not yet playable (not b's turn until a1's die is spent... but
    // it's the same face, alternation says a goes first).
    await expect(session.spendDie("a-d1", "a2")).resolves.toBeUndefined();
  });

  it("a clash die refuses a knight with no enemy in base contact", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(4)], // face 4 = bash, requires base contact
      ["b", pool(4)],
    ]);
    const measure = makeMeasure([]); // nobody adjacent
    const session = createRoundSession(baseOptions(knights, pools, "a", fixedDice(), measure));

    const targets = session.legalTargetsFor("a-d1");
    expect(targets).toEqual([{ knightId: "a1", legal: false, reason: "no-enemy-in-base-contact" }]);

    await expect(session.spendDie("a-d1", "a1")).rejects.toThrow(IllegalDieSpendError);
  });

  it("prompts for the attack target when 2+ enemies are in base contact, and hits the chosen one", async () => {
    const b1Actor = makeActor(0);
    const b2Actor = makeActor(0);
    const knights = [
      knight("a1", "a"),
      knight("b1", "b", { actor: b1Actor }),
      knight("b2", "b", { actor: b2Actor }),
    ];
    const pools = new Map([
      ["a", pool(2)], // light melee -> 1 damage
      ["b", pool(1)],
    ]);
    // Both enemies are touching a1, so the nearest-default is ambiguous and the
    // attacker must be asked which one to hit.
    const measure = makeMeasure([
      ["a1", "b1"],
      ["a1", "b2"],
    ]);

    const offered: string[] = [];
    const chooseAttackTarget = async ({
      candidates,
    }: {
      candidates: readonly { id: string; name?: string }[];
    }) => {
      offered.push(...candidates.map((candidate) => candidate.id));
      // Pick the *farther-listed* candidate, not the default candidates[0], so
      // the assertion proves the prompt's choice actually routed the damage.
      return candidates.find((candidate) => candidate.id === "b2");
    };

    const session = createRoundSession({
      ...baseOptions(knights, pools, "a", fixedDice(6), measure),
      chooseAttackTarget,
    });

    await expect(session.spendDie("a-d1", "a1")).resolves.toBeUndefined();

    expect(offered).toEqual(["b1", "b2"]); // every touching enemy is offered
    expect(b2Actor.system.damage).toBe(1); // the chosen defender took the hit
    expect(b1Actor.system.damage).toBe(0); // the nearest-default did not
  });

  it("does not prompt for an attack target when only one enemy is in base contact", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b"), knight("b2", "b")];
    const pools = new Map([
      ["a", pool(2)],
      ["b", pool(1)],
    ]);
    const measure = makeMeasure([["a1", "b1"]]); // only b1 touching; b2 is far

    let prompted = false;
    const chooseAttackTarget = async ({
      candidates,
    }: {
      candidates: readonly { id: string; name?: string }[];
    }) => {
      prompted = true;
      return candidates[0];
    };

    const session = createRoundSession({
      ...baseOptions(knights, pools, "a", fixedDice(6), measure),
      chooseAttackTarget,
    });

    await expect(session.spendDie("a-d1", "a1")).resolves.toBeUndefined();

    expect(prompted).toBe(false); // one candidate -> nothing to choose
  });

  it("an explicit declared defender bypasses the attack-target prompt", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b"), knight("b2", "b")];
    const pools = new Map([
      ["a", pool(2)],
      ["b", pool(1)],
    ]);
    const measure = makeMeasure([
      ["a1", "b1"],
      ["a1", "b2"],
    ]);

    let prompted = false;
    const chooseAttackTarget = async ({
      candidates,
    }: {
      candidates: readonly { id: string; name?: string }[];
    }) => {
      prompted = true;
      return candidates[0];
    };

    const session = createRoundSession({
      ...baseOptions(knights, pools, "a", fixedDice(6), measure),
      chooseAttackTarget,
    });

    await expect(
      session.spendDie("a-d1", "a1", { defenderKnightId: "b2" })
    ).resolves.toBeUndefined();

    expect(prompted).toBe(false); // the UI already declared the target
  });

  it("a clash die activates cleanly against an enemy in base contact", async () => {
    const knights = [knight("a1", "a"), knight("b1", "b")];
    const pools = new Map([
      ["a", pool(2)], // face 2 = light melee
      ["b", pool(1)],
    ]);
    const measure = makeMeasure([["a1", "b1"]]);
    const session = createRoundSession(baseOptions(knights, pools, "a", fixedDice(6), measure));

    const targets = session.legalTargetsFor("a-d1");
    expect(targets).toEqual([{ knightId: "a1", legal: true }]);

    await expect(session.spendDie("a-d1", "a1")).resolves.toBeUndefined();
  });

  it("a knight vanishing mid-round does not deadlock the session; discard clears a dead die", async () => {
    const knights: RoundSessionKnight[] = [];
    let removed = false;
    const a1 = knight("a1", "a", { isRemoved: () => removed });
    const enemy = knight("b1", "b");
    knights.push(a1, enemy);

    const pools = new Map([
      ["a", pool(4)], // bash, requires contact
      ["b", pool(3)],
    ]);
    const measure = makeMeasure([["a1", "b1"]]);
    const session = createRoundSession(baseOptions(knights, pools, "a", fixedDice(), measure));

    // a1 is legal while both are present and adjacent.
    expect(session.legalTargetsFor("a-d1")).toEqual([{ knightId: "a1", legal: true }]);

    // a1 is removed from play mid-round -- legality is re-derived, not cached.
    removed = true;
    expect(session.legalTargetsFor("a-d1")).toEqual([
      { knightId: "a1", legal: false, reason: "knight-removed" },
    ]);

    // Side a has no legal target for its remaining die: discard, don't deadlock.
    await expect(session.spendDie("a-d1", "a1")).rejects.toThrow(IllegalDieSpendError);
    await expect(session.discardDie("a-d1", "no-legal-target")).resolves.toBeUndefined();

    expect(session.activePlayerId()).toBe("b");
    await session.discardDie("b-d1", "irrelevant");

    expect(session.isComplete()).toBe(true);
  });

  it("completion runs the courage phase and is reflected in isComplete/courageOutcomes", async () => {
    const attacker = makeActor(0);
    const defender = makeActor(1); // already damaged, in contact -> will test courage
    const knights = [
      knight("a1", "a", { actor: attacker }),
      knight("b1", "b", { actor: defender }),
    ];
    const pools = new Map([
      ["a", pool(6)],
      ["b", pool(5)],
    ]);
    const measure = makeMeasure([["a1", "b1"]]);
    let courageRollCount = 0;
    const dice: DiceApiLike = {
      async roll() {
        courageRollCount += 1;
        return { total: 6 }; // always passes
      },
    };
    const session = createRoundSession(baseOptions(knights, pools, "a", dice, measure));

    expect(session.isComplete()).toBe(false);
    expect(session.courageOutcomes()).toBeUndefined();

    await session.spendDie("a-d1", "a1"); // sprint, not complete yet
    expect(session.isComplete()).toBe(false);

    await session.spendDie("b-d1", "b1"); // last die -> triggers courage phase
    expect(session.isComplete()).toBe(true);

    const outcomes = session.courageOutcomes();
    expect(outcomes).toBeDefined();
    expect(outcomes?.get("b1")?.passed).toBe(true);
    expect(courageRollCount).toBeGreaterThan(0);
  });

  it("counts allies already removed from play in courage difficulty, not just this-phase flights", async () => {
    // QSR p2 (confirmed): difficulty = (allied knights removed from play) +
    // (damage on the testing knight). b2 is already off the board when the
    // courage phase begins, so b1's test must feel that loss: difficulty is
    // 1 (removed ally) + 1 (own damage) = 2, not 0 + 1. Seeding only the
    // this-phase cascade -- as the caller did before -- undercounts the
    // death-spiral the rule is built around.
    const b1Actor = makeActor(1); // damaged and in contact -> tests
    const knights = [
      knight("a1", "a"),
      knight("b1", "b", { actor: b1Actor }),
      knight("b2", "b", { isRemoved: () => true }), // already removed from play
    ];
    const pools = new Map([
      ["a", pool(6)],
      ["b", pool(5)],
    ]);
    const measure = makeMeasure([["a1", "b1"]]);
    const dice: DiceApiLike = {
      async roll() {
        return { total: 6 }; // always passes; difficulty is recorded regardless
      },
    };
    const session = createRoundSession(baseOptions(knights, pools, "a", dice, measure));

    await session.spendDie("a-d1", "a1");
    await session.spendDie("b-d1", "b1"); // last die -> triggers courage phase

    expect(session.courageOutcomes()?.get("b1")?.difficulty).toBe(2);
  });
});

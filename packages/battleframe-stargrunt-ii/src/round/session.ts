import { MODULE_ID } from "../constants";

/**
 * The two-action alternating activation session — Stargrunt II's own control
 * flow. Built by copying the SHAPE of Simple Skirmish's `createSkirmishRound`
 * (continuous alternation + serialize/restore to a Combat-document flag) and
 * EXTENDING it with the three SG2-specific transitions: first activation chosen
 * by the smaller force (D1), a legal "pass" only when outnumbered in remaining
 * activations (D2), and a per-activation two-action budget (D3). Kept
 * ruleset-local and NOT generalised into core (design risk 7.2) — only the
 * separable predicates are built so a future engine port is a lift, not a
 * rewrite.
 */

export class IllegalActivationError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalActivationError";
  }
}

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalActionError";
  }
}

export interface StargruntUnit {
  id: string;
  sideId: string;
  /** Live query — true once destroyed. Optional; absent means "still on table". */
  isDestroyed?: () => boolean;
}

// ---------------------------------------------------------------------------
// D1 — first activator: the smaller force chooses to go first.
// ---------------------------------------------------------------------------

/**
 * The side with the fewer un-activated units activates first. A tie returns
 * `"tie"` so the caller rolls off or asks the GM — guessing a winner would
 * invent a rule.
 */
export function firstActivator(unitCountBySide: Record<string, number>): string | "tie" {
  let best: string | undefined;
  let bestCount = Infinity;
  let tied = false;

  for (const [side, count] of Object.entries(unitCountBySide)) {
    if (count < bestCount) {
      best = side;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }

  return best && !tied ? best : "tie";
}

// ---------------------------------------------------------------------------
// D2 — the pass rule: legal only when strictly outnumbered in face-up units.
// ---------------------------------------------------------------------------

/**
 * A side may pass its activation slot only when it has STRICTLY fewer face-up
 * (un-activated) units than its opponent — the SG2 rule that lets an outnumbered
 * side avoid committing its last units. `faceUpCounts` maps every side to its
 * un-activated count.
 */
export function canPass(side: string, faceUpCounts: Record<string, number>): boolean {
  const mine = faceUpCounts[side] ?? 0;
  for (const [other, count] of Object.entries(faceUpCounts)) {
    if (other !== side && mine < count) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// D3 — the two-action budget, nested inside a single activation.
// ---------------------------------------------------------------------------

export interface ActivationBudget {
  unitId: string;
  /** Actions left this activation (opens at 2). */
  actionsRemaining: number;
  /** Weapons that have already fired — each may fire only once per activation. */
  firedWeaponIds: string[];
  /** Move actions spent this activation. */
  moveCount: number;
  /** True once the unit has moved with BOTH actions (Phase-2 reaction fire). */
  reactionEligible: boolean;
}

/** Open a fresh activation with a budget of two actions. */
export function startActivation(unitId: string): ActivationBudget {
  return { unitId, actionsRemaining: 2, firedWeaponIds: [], moveCount: 0, reactionEligible: false };
}

/** Spend one Move action. Moving with both actions flags reaction eligibility. */
export function spendMove(budget: ActivationBudget): ActivationBudget {
  if (budget.actionsRemaining <= 0) {
    throw new IllegalActionError(`unit ${budget.unitId} has no actions left to move`);
  }
  const moveCount = budget.moveCount + 1;
  return {
    ...budget,
    actionsRemaining: budget.actionsRemaining - 1,
    moveCount,
    reactionEligible: moveCount >= 2
  };
}

/** Spend one Fire action with `weaponId`. A weapon may fire only once per turn. */
export function spendFire(budget: ActivationBudget, weaponId: string): ActivationBudget {
  if (budget.actionsRemaining <= 0) {
    throw new IllegalActionError(`unit ${budget.unitId} has no actions left to fire`);
  }
  if (budget.firedWeaponIds.includes(weaponId)) {
    throw new IllegalActionError(
      `weapon ${weaponId} has already fired this activation for unit ${budget.unitId}`
    );
  }
  return {
    ...budget,
    actionsRemaining: budget.actionsRemaining - 1,
    firedWeaponIds: [...budget.firedWeaponIds, weaponId]
  };
}

/** True once the two-action budget is exhausted. */
export function isActivationComplete(budget: ActivationBudget): boolean {
  return budget.actionsRemaining === 0;
}

// ---------------------------------------------------------------------------
// D4/D5 — the alternating round with pass tracking + serialize/restore.
// ---------------------------------------------------------------------------

export interface StargruntRoundState {
  firstSideId: string;
  activatedIds: string[];
  /** Index into the ordered sides — whose slot is next. */
  turnPointer: number;
  /** The turn track (1-based). */
  turn: number;
  /** Passes since the last activation — both sides passing in a row ends the turn. */
  consecutivePasses: number;
}

export interface StargruntRound {
  activeSideId(): string | undefined;
  activate(unitId: string): void;
  pass(sideId: string): void;
  isActivated(unitId: string): boolean;
  unactivated(sideId: string): string[];
  /** Un-activated (face-up) unit count per side — the input to `canPass`. */
  faceUpCounts(): Record<string, number>;
  /** True once the turn is over: everyone resolved, or both sides passed in a row. */
  isTurnComplete(): boolean;
  serialize(): StargruntRoundState;
}

export function createStargruntRound(
  allUnits: readonly StargruntUnit[],
  firstSideId: string,
  initial?: Partial<Omit<StargruntRoundState, "firstSideId">>
): StargruntRound {
  const sides = orderedSides(allUnits, firstSideId);
  const unitById = new Map(allUnits.map((u) => [u.id, u]));
  const activated = new Set<string>(initial?.activatedIds ?? []);
  let turnPointer = initial?.turnPointer ?? 0;
  const turn = initial?.turn ?? 1;
  let consecutivePasses = initial?.consecutivePasses ?? 0;

  const isDestroyed = (u: StargruntUnit): boolean => u.isDestroyed?.() === true;
  const isResolved = (u: StargruntUnit): boolean => activated.has(u.id) || isDestroyed(u);

  function unactivated(sideId: string): string[] {
    return allUnits.filter((u) => u.sideId === sideId && !isResolved(u)).map((u) => u.id);
  }

  function faceUpCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const side of sides) {
      counts[side] = unactivated(side).length;
    }
    return counts;
  }

  function allResolved(): boolean {
    return allUnits.every(isResolved);
  }

  function isTurnComplete(): boolean {
    return allResolved() || consecutivePasses >= sides.length;
  }

  function activeSideId(): string | undefined {
    if (isTurnComplete()) {
      return undefined;
    }
    for (let step = 0; step < sides.length; step += 1) {
      const side = sides[(turnPointer + step) % sides.length];
      if (unactivated(side).length > 0) {
        return side;
      }
    }
    return undefined;
  }

  function advancePointer(sideId: string): void {
    turnPointer = (sides.indexOf(sideId) + 1) % sides.length;
  }

  return {
    activeSideId,
    isActivated: (unitId) => activated.has(unitId),
    unactivated,
    faceUpCounts,
    isTurnComplete,
    activate(unitId) {
      const unit = unitById.get(unitId);
      if (!unit) {
        throw new IllegalActivationError(`unknown unit: ${unitId}`);
      }
      if (activated.has(unitId)) {
        throw new IllegalActivationError(`unit ${unitId} is already activated this turn`);
      }
      if (isDestroyed(unit)) {
        throw new IllegalActivationError(`unit ${unitId} is destroyed and cannot be activated`);
      }
      const expected = activeSideId();
      if (unit.sideId !== expected) {
        throw new IllegalActivationError(
          `it is not ${unit.sideId}'s slot (expected ${expected ?? "no one"})`
        );
      }
      activated.add(unitId);
      consecutivePasses = 0;
      advancePointer(unit.sideId);
    },
    pass(sideId) {
      const expected = activeSideId();
      if (sideId !== expected) {
        throw new IllegalActivationError(
          `${sideId} cannot pass — it is ${expected ?? "no one"}'s slot`
        );
      }
      if (!canPass(sideId, faceUpCounts())) {
        throw new IllegalActivationError(
          `${sideId} may not pass — it does not have fewer face-up units than its opponent`
        );
      }
      consecutivePasses += 1;
      advancePointer(sideId);
    },
    serialize: () => ({
      firstSideId,
      activatedIds: [...activated],
      turnPointer,
      turn,
      consecutivePasses
    })
  };
}

/** Rebuild a round from the state persisted on the Combat document. */
export function restoreStargruntRound(
  allUnits: readonly StargruntUnit[],
  state: StargruntRoundState
): StargruntRound {
  return createStargruntRound(allUnits, state.firstSideId, {
    activatedIds: state.activatedIds,
    turnPointer: state.turnPointer,
    turn: state.turn,
    consecutivePasses: state.consecutivePasses
  });
}

/** True once the round's turn is over. Free-function form for the glue. */
export function turnComplete(round: StargruntRound): boolean {
  return round.isTurnComplete();
}

/**
 * D4 — the Turn-End reset: clear every unit's activation, reset the pass track,
 * and bump the turn number, with the next turn's first activator chosen fresh
 * (the smaller force, via D1). Pure: returns the next turn's state for the glue
 * to persist and register through `advance`.
 */
export function beginNextTurn(
  state: StargruntRoundState,
  nextFirstSideId: string
): StargruntRoundState {
  return {
    firstSideId: nextFirstSideId,
    activatedIds: [],
    turnPointer: 0,
    turn: state.turn + 1,
    consecutivePasses: 0
  };
}

function orderedSides(units: readonly StargruntUnit[], firstSideId: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const unit of units) {
    if (!seen.has(unit.sideId)) {
      seen.add(unit.sideId);
      order.push(unit.sideId);
    }
  }
  const index = order.indexOf(firstSideId);
  if (index < 0) {
    throw new IllegalActivationError(
      `firstSideId "${firstSideId}" controls none of the units in this round`
    );
  }
  return index === 0 ? order : [...order.slice(index), ...order.slice(0, index)];
}

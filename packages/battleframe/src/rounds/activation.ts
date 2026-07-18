import { SYSTEM_ID } from "../constants";

/**
 * Ruleset-neutral, two-tier activation order.
 *
 * Rulesets differ in *who acts next* but share a shape: some units act in a
 * privileged first pass, then the rest act in some interleaving. This service
 * captures that once.
 *
 *  - **Priority tier** — units whose `hasPriority()` is true act first,
 *    alternating between sides (the round's first side leading). A side with no
 *    priority unit left is skipped rather than stalling the tier.
 *  - **Main tier** — everyone else. The next side is chosen by `selectMain`,
 *    which defaults to plain alternation but can be swapped for anything: e.g.
 *    a ruleset that drops one token per un-activated unit into a bag and draws
 *    passes a count-weighted random pick over the sides that still have units.
 *    The selector is handed the live per-side counts to weight on.
 *
 * A unit whose `isResolved()` is true (destroyed / removed / fled) needs no
 * activation and is treated as already done, the same live-query discipline the
 * shipped rulesets' rounds use.
 *
 * Every query is recomputed from the units' live callbacks, never snapshotted,
 * so a unit dying mid-round changes the order immediately.
 */

export interface ActivationUnit {
  id: string;
  sideId: string;
  /** True once the unit needs no activation (destroyed / removed). Optional. */
  isResolved?: () => boolean;
  /** True if the unit holds a priority order this round. Optional. */
  hasPriority?: () => boolean;
}

/**
 * Picks the next side to act in the main tier, from the sides that still have an
 * eligible unit (given in the round's side order) and their live eligible
 * counts. Must return one of `sides`.
 */
export type MainSelector = (
  sides: readonly string[],
  counts: Readonly<Record<string, number>>
) => string;

export type ActivationPhase = "priority" | "main" | "complete";

export interface ActivationOrder {
  /** Which tier the round is in, or "complete" once every unit is resolved. */
  phase(): ActivationPhase;
  /** Whose turn it is to activate a unit, or undefined once complete. */
  activeSideId(): string | undefined;
  /** The active-phase unit ids `sideId` may legally activate right now. */
  eligible(sideId: string): string[];
  isActivated(unitId: string): boolean;
  /** Activates `unitId`; throws on an out-of-turn, repeat, resolved, wrong-tier, or unknown activation. */
  activate(unitId: string): void;
  isComplete(): boolean;
}

export class IllegalActivationError extends Error {
  constructor(message: string) {
    super(`${SYSTEM_ID} | ${message}`);
    this.name = "IllegalActivationError";
  }
}

export interface CreateActivationOrderParams {
  units: readonly ActivationUnit[];
  firstSideId: string;
  /** Main-tier side picker. Defaults to alternation led by the first side. */
  selectMain?: MainSelector;
}

export function createActivationOrder(params: CreateActivationOrderParams): ActivationOrder {
  const { units, firstSideId, selectMain } = params;
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const sides = orderedSides(units, firstSideId);
  const activated = new Set<string>();

  let priorityPointer = 0;
  let mainPointer = 0;
  let cachedMainSide: string | undefined;

  const isResolved = (unit: ActivationUnit): boolean => unit.isResolved?.() === true;
  const isDone = (unit: ActivationUnit): boolean => activated.has(unit.id) || isResolved(unit);
  const isPriority = (unit: ActivationUnit): boolean => unit.hasPriority?.() === true;

  const priorityOpen = (): boolean => units.some((unit) => isPriority(unit) && !isDone(unit));
  const anyOpen = (): boolean => units.some((unit) => !isDone(unit));

  function phase(): ActivationPhase {
    if (!anyOpen()) {
      return "complete";
    }
    return priorityOpen() ? "priority" : "main";
  }

  /** Units of a side that are still eligible *in the current phase*. */
  function eligibleUnits(sideId: string): ActivationUnit[] {
    const current = phase();
    return units.filter((unit) => {
      if (unit.sideId !== sideId || isDone(unit)) {
        return false;
      }
      return current === "priority" ? isPriority(unit) : true;
    });
  }

  function sidesWithEligible(): string[] {
    return sides.filter((sideId) => eligibleUnits(sideId).length > 0);
  }

  function activePrioritySide(): string | undefined {
    for (let step = 0; step < sides.length; step += 1) {
      const sideId = sides[(priorityPointer + step) % sides.length];
      if (eligibleUnits(sideId).length > 0) {
        return sideId;
      }
    }
    return undefined;
  }

  function pickMainSide(): string | undefined {
    const candidates = sidesWithEligible();
    if (candidates.length === 0) {
      return undefined;
    }

    if (selectMain) {
      const counts: Record<string, number> = {};
      for (const sideId of candidates) {
        counts[sideId] = eligibleUnits(sideId).length;
      }
      const choice = selectMain(candidates, counts);
      if (!candidates.includes(choice)) {
        throw new IllegalActivationError(
          `main-tier selector returned "${choice}", which has no eligible unit`
        );
      }
      return choice;
    }

    // Default: alternate. From the pointer, the next side in order with a unit.
    for (let step = 0; step < sides.length; step += 1) {
      const sideId = sides[(mainPointer + step) % sides.length];
      if (candidates.includes(sideId)) {
        return sideId;
      }
    }
    return candidates[0];
  }

  function activeMainSide(): string | undefined {
    if (cachedMainSide && eligibleUnits(cachedMainSide).length > 0) {
      return cachedMainSide;
    }
    cachedMainSide = pickMainSide();
    return cachedMainSide;
  }

  function activeSideId(): string | undefined {
    const current = phase();
    if (current === "complete") {
      return undefined;
    }
    return current === "priority" ? activePrioritySide() : activeMainSide();
  }

  return {
    phase,
    activeSideId,
    isActivated: (unitId) => activated.has(unitId),
    isComplete: () => !anyOpen(),
    eligible(sideId) {
      return eligibleUnits(sideId).map((unit) => unit.id);
    },
    activate(unitId) {
      const unit = unitById.get(unitId);
      if (!unit) {
        throw new IllegalActivationError(`unknown unit: ${unitId}`);
      }
      if (activated.has(unitId)) {
        throw new IllegalActivationError(`unit ${unitId} is already activated this round`);
      }
      if (isResolved(unit)) {
        throw new IllegalActivationError(`unit ${unitId} is resolved and cannot be activated`);
      }

      const current = phase();
      const expected = activeSideId();
      if (unit.sideId !== expected) {
        throw new IllegalActivationError(
          `it is not ${unit.sideId}'s turn to activate (expected ${expected ?? "no one"})`
        );
      }
      if (current === "priority" && !isPriority(unit)) {
        throw new IllegalActivationError(
          `unit ${unitId} has no priority order; the priority tier must be cleared first`
        );
      }

      activated.add(unitId);

      const sideIndex = sides.indexOf(unit.sideId);
      if (current === "priority") {
        priorityPointer = (sideIndex + 1) % sides.length;
      } else {
        mainPointer = (sideIndex + 1) % sides.length;
      }
      // Force the main-tier side to be re-picked after any activation.
      cachedMainSide = undefined;
    }
  };
}

function orderedSides(units: readonly ActivationUnit[], firstSideId: string): string[] {
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

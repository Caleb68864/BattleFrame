import type { DieType } from "../dice/ladder";
import { impactOutcome, type ImpactResult } from "./impact";
import { allocateCasualties, type Figure } from "./casualties";

/** The die-type ladder as faces, for firepower rounding. */
const DIE_LADDER: readonly DieType[] = ["d4", "d6", "d8", "d10", "d12"];

/** The face count of a die type, e.g. `"d8"` -> 8. */
function dieFaces(die: DieType): number {
  return Number(die.slice(1));
}

/**
 * B1 — how many firer faces strictly EXCEED the single Range-Die face. A tie is
 * not a beat (strict `>`).
 */
export function beatsAgainst(firerFaces: readonly number[], targetFace: number): number {
  return firerFaces.filter((f) => f > targetFace).length;
}

export type FireTier = "miss" | "suppress" | "effective";

/** B2 — beat count to fire tier: 0 miss, 1 suppress, 2+ effective. */
export function fireTier(beats: number): FireTier {
  if (beats >= 2) {
    return "effective";
  }
  return beats === 1 ? "suppress" : "miss";
}

export interface PotentialHits {
  whole: number;
  remainder: number;
}

/**
 * B3 — the summed firer pool (ALL faces, losers included) divided by the
 * Range-Die TYPE number (4/6/8/10/12), giving whole potential hits plus a
 * remainder that may buy one more (B4).
 */
export function potentialHits(firerFacesSum: number, rangeDieType: number): PotentialHits {
  return {
    whole: Math.floor(firerFacesSum / rangeDieType),
    remainder: firerFacesSum % rangeDieType
  };
}

/**
 * B4 — the remainder buys one extra hit iff a freshly re-rolled Range Die comes
 * in at or under it. A zero remainder never yields an extra hit (guard before
 * rolling).
 */
export function extraHitFromRemainder(remainder: number, rangeDieRoll: number): boolean {
  return remainder > 0 && rangeDieRoll <= remainder;
}

/**
 * B7 — the small-arms Firepower die: `fpRating * figuresFiring` rounded UP to the
 * nearest die type on the ladder, capped at d12. The FP rating itself is
 * user-entered; only the rounding rule is ours.
 */
export function computeFirepowerDie(fpRating: number, figuresFiring: number): DieType {
  const product = fpRating * figuresFiring;
  for (const die of DIE_LADDER) {
    if (dieFaces(die) >= product) {
      return die;
    }
  }
  return "d12";
}

export interface DiceRollResult {
  total: number;
}

export interface DiceApiLike {
  roll(
    formula: string,
    data?: Record<string, unknown>,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<DiceRollResult>;
  rollPool(
    count: number,
    dieSize: number,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<number[]>;
}

export interface DispersedFireParams {
  dice: DiceApiLike;
  /** The firing unit's Quality die (one of the firer dice). */
  firerQualityDie: DieType;
  /** The computed small-arms Firepower die (B7). */
  firepowerDie: DieType;
  /** Extra firer dice from support weapons (one die each). */
  supportDice?: DieType[];
  /** The weapon's Impact die, rolled once per hit. */
  impactDie: DieType;
  /** The Range Die the target rolls (already includes cover / In-Position, B6). */
  rangeDie: DieType;
  /**
   * The defender's Armour die used for impact resolution. Per-figure armour is
   * carried on the roster for the sheet and allocation surface; MVP dispersed
   * fire resolves impact against this single representative die (per-figure
   * impact rolls are a Phase-2 refinement — see docs/decisions.md).
   */
  targetArmourDie: DieType;
  /** The target unit's living roster, for casualty allocation. */
  targetFigures: Figure[];
  /** Injected for deterministic casualty allocation. */
  rng: () => number;
  flavorPrefix?: string;
}

export interface DispersedFireOutcome {
  firerFaces: number[];
  rangeFace: number;
  beats: number;
  tier: FireTier;
  sum: number;
  potentialHits: number;
  remainder: number;
  extraHit: boolean;
  hits: number;
  impacts: { impact: number; armour: number; result: ImpactResult }[];
  figures: Figure[];
  wiped: boolean;
  suppressionApplied: boolean;
}

/**
 * B9 — one dispersed-fire action, composing B1-B8. The firer throws its Quality
 * die + the small-arms Firepower die + one die per support weapon; the target
 * throws the single Range Die. Beats set the tier; an effective result converts
 * the summed pool into potential hits (+ a possible remainder hit), resolves
 * each hit Impact-vs-Armour, and allocates the resulting wounds/kills onto the
 * roster. Every effective OR suppress result lays suppression.
 *
 * Dice and rng are injected so this is testable without a live Foundry; the UI
 * glue passes the engine `dice` service and `Math.random`.
 */
export async function resolveDispersedFire(
  params: DispersedFireParams
): Promise<DispersedFireOutcome> {
  const { dice, rng } = params;
  const prefix = params.flavorPrefix ? `${params.flavorPrefix} ` : "";

  const rollDie = async (die: DieType, flavor: string): Promise<number> =>
    (await dice.roll(`1${die}`, undefined, { flavor: `${prefix}${flavor}` })).total;

  // Firer pool: Quality + Firepower + each support weapon, as single dice.
  const firerDice: DieType[] = [
    params.firerQualityDie,
    params.firepowerDie,
    ...(params.supportDice ?? [])
  ];
  const firerFaces: number[] = [];
  for (const die of firerDice) {
    firerFaces.push(await rollDie(die, "firer"));
  }

  const rangeFace = await rollDie(params.rangeDie, "range");
  const beats = beatsAgainst(firerFaces, rangeFace);
  const tier = fireTier(beats);

  const base: DispersedFireOutcome = {
    firerFaces,
    rangeFace,
    beats,
    tier,
    sum: firerFaces.reduce((s, f) => s + f, 0),
    potentialHits: 0,
    remainder: 0,
    extraHit: false,
    hits: 0,
    impacts: [],
    figures: params.targetFigures.map((f) => ({ ...f })),
    wiped: false,
    suppressionApplied: tier !== "miss"
  };

  if (tier !== "effective") {
    return base;
  }

  const rangeType = dieFaces(params.rangeDie);
  const { whole, remainder } = potentialHits(base.sum, rangeType);

  let extraHit = false;
  if (remainder > 0) {
    const reroll = await rollDie(params.rangeDie, "extra-hit");
    extraHit = extraHitFromRemainder(remainder, reroll);
  }

  const hits = whole + (extraHit ? 1 : 0);

  const impacts: DispersedFireOutcome["impacts"] = [];
  let wounds = 0;
  let kills = 0;
  for (let h = 0; h < hits; h += 1) {
    const impact = await rollDie(params.impactDie, "impact");
    const armour = await rollDie(params.targetArmourDie, "armour");
    const result = impactOutcome(impact, armour);
    impacts.push({ impact, armour, result });
    if (result === "wound") {
      wounds += 1;
    } else if (result === "kill") {
      kills += 1;
    }
  }

  const allocation = allocateCasualties(params.targetFigures, { wounds, kills }, rng);

  return {
    ...base,
    potentialHits: whole,
    remainder,
    extraHit,
    hits,
    impacts,
    figures: allocation.figures,
    wiped: allocation.wiped
  };
}

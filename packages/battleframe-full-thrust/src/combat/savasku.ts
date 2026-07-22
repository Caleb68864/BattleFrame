/**
 * Sa'Vasku bio-ship mechanics: the living warships that, each turn, split a pool
 * of Power Points (summed from their Power Generators) among four pools --
 * Movement, Attack, Defence, Repair -- instead of mounting fixed-rating systems.
 * Pure functions over power, MASS, range and die faces; the actual rolling (via
 * game.battleframe.dice.rollPool) and the pool-allocation UI live in the firing /
 * orders orchestration.
 *
 * The defining Sa'Vasku traits captured here:
 *   - power = the summed MASS of surviving generators, "use it or lose it"
 *     (powerPoolTotal); Movement/Defence/Repair costs are MASS-derived
 *     (driveThrustCost, ftlJumpCost, screenNodeMass, systemRepairCost);
 *   - the Stinger beam turns Attack power into hit-dice, the power per die
 *     doubling every 12mu band (stingerPowerPerDie / stingerDiceForPower); the
 *     dice themselves are ordinary FT2 beam dice, so per-die damage reuses
 *     beam.ts (`poolBeamDamage`) -- NOT re-implemented here;
 *   - the living hull is BIOMASS: inflicted damage runs through the ordinary
 *     armour-first path (carapace = armour), but the ship can also CONSUME its
 *     own biomass to feed pods/drones/repair, which never trips a threshold and
 *     kills the ship only when consumed + damaged boxes meet (consumeBiomass).
 *
 * Reuse, not re-implementation: the Lance Pod's armour-pierce hit is exactly the
 * K-gun rule (applyLancePodHit -> applyKgunHit); the Interceptor Pod's effect is
 * a Kra'Vak scattergun (kravak.ts); the Spicule rolls as a PDS. Those callers use
 * the existing helpers directly.
 *
 * Baseline is Fleet Book 2 (the current, canonical Sa'Vasku file). DEFERRED, each
 * flagged where relevant: (a) the Stinger's "6 = reroll" penetrating layer -- the
 * dice use the FT2 base beam table, mirroring beam.ts which likewise defers the
 * reroll layer; (b) the earlier More Thrust "Power Factor" model (5 dice/turn for
 * power, up-to-PF storage between turns) -- a superseded edition layer, mirroring
 * how kravak.ts leaves the More Thrust railgun variant out of scope.
 *
 * Sources (user's notes): Factions & Ships/Xeno/Sa'Vasku.md,
 * Sa'Vasku Power Points.md, Sa'Vasku Systems.md.
 */

import {
  SAVASKU_THRUST_COST_PERCENT,
  SAVASKU_DAMAGED_DRIVE_MULTIPLIER,
  SAVASKU_SCREEN_NODE_MASS_PERCENT,
  SAVASKU_SCREEN_NODE_MIN_MASS,
  SAVASKU_STINGER_BAND_MU,
  SAVASKU_STINGER_MAX_RANGE_MU,
  SAVASKU_STINGER_POWER_PER_DIE_BY_BAND,
  SAVASKU_LANCE_POD_BAND_MU,
  SAVASKU_LANCE_POD_MAX_RANGE_MU,
  SAVASKU_LANCE_POD_TO_HIT_BY_BAND,
  SAVASKU_REPAIR_SUCCESS_MIN,
  SAVASKU_DRONE_POWER_PER,
  SAVASKU_DRONE_BIOMASS_PER,
  SAVASKU_LEECH_CLEAR_MIN,
  SAVASKU_LEECH_CLEAR_MAX
} from "../constants";
import { bandIndex } from "./bands";
import { applyKgunHit } from "./kravak";
import type { ArmourState, HullState, ApplyDamageWithArmourResult } from "../ship/damage";

// --- Power pool -------------------------------------------------------------

/**
 * A ship's Power Point pool this turn: the summed MASS of its still-functioning
 * generators (each generator's value = its MASS). Pass only the surviving
 * generators' MASS -- a generator whose damage-track row is gone is simply
 * dropped from the list, lowering the sum. Unspent points are lost (no storage),
 * which is a caller concern, not modelled here.
 */
export function powerPoolTotal(functioningGeneratorMasses: readonly number[]): number {
  return functioningGeneratorMasses.reduce((sum, mass) => sum + Math.max(0, mass), 0);
}

// --- Movement pool ----------------------------------------------------------

/**
 * Movement-pool cost to power `thrust` points of the Main Drive Node on a ship of
 * `shipMass`: 2% x thrust x MASS, rounded UP; a `damaged` drive costs double.
 */
export function driveThrustCost(thrust: number, shipMass: number, damaged = false): number {
  const multiplier = damaged ? SAVASKU_DAMAGED_DRIVE_MULTIPLIER : 1;
  return Math.ceil((SAVASKU_THRUST_COST_PERCENT / 100) * thrust * shipMass * multiplier);
}

/** Movement-pool cost of an FTL jump: points equal to the FTL node's MASS. */
export function ftlJumpCost(ftlNodeMass: number): number {
  return Math.max(0, ftlNodeMass);
}

// --- Defence pool -----------------------------------------------------------

/**
 * MASS of a Screen Node on a ship of `shipMass` -- also the Defence-pool cost to
 * keep that screen up for the turn: 5% of ship MASS (rounded up), floored at the
 * 3-MASS minimum. A node with no D power is not functional and that power is
 * wasted (a caller concern).
 */
export function screenNodeMass(shipMass: number): number {
  const pct = Math.ceil((SAVASKU_SCREEN_NODE_MASS_PERCENT / 100) * shipMass);
  return Math.max(SAVASKU_SCREEN_NODE_MIN_MASS, pct);
}

// --- Stinger nodes (beams) --------------------------------------------------

/**
 * Attack power needed per Stinger hit-die at `distanceMu`: 1 PP in the first 12mu
 * band, doubling every further band (1/2/4/8/16/32) out to 72mu, or null beyond
 * range. Band boundaries belong to the nearer band (a target at exactly 12mu is
 * in the first band). Per-die DAMAGE is ordinary FT2 beam dice -- feed the rolled
 * faces to beam.ts `poolBeamDamage` (screens apply normally).
 */
export function stingerPowerPerDie(distanceMu: number): number | null {
  if (!Number.isFinite(distanceMu) || distanceMu > SAVASKU_STINGER_MAX_RANGE_MU) {
    return null;
  }
  // `?? null` guards a band index off the end of the table -- never return
  // `undefined`, which a `=== null` caller would misread as "in range".
  return SAVASKU_STINGER_POWER_PER_DIE_BY_BAND[bandIndex(distanceMu, SAVASKU_STINGER_BAND_MU)] ?? null;
}

/**
 * Hit-dice a Stinger node rolls when `powerSpent` Attack points are allocated to
 * it against a target at `distanceMu`: floor(power / power-per-die). Zero out of
 * range or when the power buys less than one die. One node fires at one
 * target/turn regardless of how much power it is given.
 */
export function stingerDiceForPower(powerSpent: number, distanceMu: number): number {
  const perDie = stingerPowerPerDie(distanceMu);
  if (perDie === null || perDie <= 0) {
    return 0;
  }
  return Math.floor(Math.max(0, powerSpent) / perDie);
}

// --- Pod Launcher nodes -----------------------------------------------------

/**
 * Lance Pod to-hit target number at `distanceMu` (3+/4+/5+/6 by 6mu band), or
 * null beyond the 24mu maximum range.
 */
export function lancePodToHit(distanceMu: number): number | null {
  if (!Number.isFinite(distanceMu) || distanceMu > SAVASKU_LANCE_POD_MAX_RANGE_MU) {
    return null;
  }
  return SAVASKU_LANCE_POD_TO_HIT_BY_BAND[bandIndex(distanceMu, SAVASKU_LANCE_POD_BAND_MU)] ?? null;
}

export interface ApplyLancePodHitParams {
  armour: ArmourState;
  hull: HullState;
  /** The Lance Pod damage die's face -- damage of this single hit is the face itself. */
  face: number;
}

/**
 * Applies one Lance Pod hit: damage = the rolled `face`, taken under the same
 * armour-pierce rule as a K-gun hit (only the first DP spends carapace/armour,
 * the remainder goes straight to hull). Reuses applyKgunHit -- the pierce
 * mechanic is identical.
 */
export function applyLancePodHit(params: ApplyLancePodHitParams): ApplyDamageWithArmourResult {
  return applyKgunHit({ armour: params.armour, hull: params.hull, damage: params.face });
}

/**
 * Whether spending `rPoolPoints` Repair points this turn kills off a burning
 * Leech Pod: the Sa'Vasku clear it for 1-3 R-pool points. The impact (2 DP) and
 * per-turn ongoing (2 DP) damage are non-penetrating -- apply them via the
 * ordinary armour-first applier (applyDamageWithArmour), using the
 * SAVASKU_LEECH_POD_IMPACT_DP / _ONGOING_DP constants.
 */
export function leechPodClears(rPoolPoints: number): boolean {
  return rPoolPoints >= SAVASKU_LEECH_CLEAR_MIN && rPoolPoints <= SAVASKU_LEECH_CLEAR_MAX;
}

// --- Repair pool ------------------------------------------------------------

/** Repair-pool points a system-repair attempt costs: the MASS of the system/node. */
export function systemRepairCost(systemMass: number): number {
  return Math.max(0, systemMass);
}

/** Whether a system-repair attempt succeeds: a die roll of 4 or higher. */
export function systemRepairSucceeds(roll: number): boolean {
  return roll >= SAVASKU_REPAIR_SUCCESS_MIN;
}

export interface DroneGrowthCost {
  power: number;
  biomass: number;
}

/**
 * The Repair-pool power and biomass a Drone Womb spends to grow `droneCount`
 * drones: 1 R-pool point and 1 biomass per drone (drones come in groups of 6).
 */
export function droneGrowthCost(droneCount: number): DroneGrowthCost {
  const n = Math.max(0, Math.floor(droneCount));
  return { power: n * SAVASKU_DRONE_POWER_PER, biomass: n * SAVASKU_DRONE_BIOMASS_PER };
}

// --- Biomass (living hull) --------------------------------------------------

export interface BiomassState {
  /** Total biomass boxes (1 MASS each). */
  boxes: number;
  /** Boxes lost to inflicted damage (from the near end); these trip thresholds. */
  damage: number;
  /** Boxes the ship has consumed itself (from the far end); never trips a threshold. */
  consumed: number;
}

export interface ConsumeBiomassResult {
  biomass: BiomassState;
  /** Boxes actually consumed (capped at what remained). */
  consumed: number;
  /** True once consumed + damaged boxes meet -- the ship is dead. */
  dead: boolean;
}

/** Biomass boxes neither damaged nor consumed yet -- what is left to feed/repair with. */
export function biomassRemaining(state: BiomassState): number {
  return Math.max(0, state.boxes - state.damage - state.consumed);
}

/**
 * Consumes up to `amount` biomass from the far end (to feed pods, grow drones, or
 * repair), capped at what remains. Consumption NEVER triggers a threshold check
 * (unlike inflicted damage, which should go through applyDamageWithArmour with
 * the carapace as armour). The ship is dead once consumed and damaged boxes meet.
 */
export function consumeBiomass(state: BiomassState, amount: number): ConsumeBiomassResult {
  const taken = Math.min(Math.max(0, amount), biomassRemaining(state));
  const biomass: BiomassState = { ...state, consumed: state.consumed + taken };
  return {
    biomass,
    consumed: taken,
    dead: biomass.damage + biomass.consumed >= biomass.boxes
  };
}

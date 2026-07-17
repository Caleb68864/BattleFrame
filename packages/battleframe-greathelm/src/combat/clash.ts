import { ActionId, HEAVY_ATTACK_DAMAGE, LIGHT_ATTACK_DAMAGE, MODULE_ID } from "../constants";

export interface DiceRollResult {
  total: number;
}

export interface DiceApiLike {
  roll(
    formula: string,
    data?: Record<string, unknown>,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<DiceRollResult>;
}

export interface MeasureResultLike {
  distance: number;
}

export interface MeasureApiLike {
  between(tokenA: unknown, tokenB: unknown): MeasureResultLike;
}

function resolveGame():
  | { battleframe?: { dice?: DiceApiLike; measure?: MeasureApiLike } }
  | undefined {
  const globalScope = globalThis as unknown as {
    game?: { battleframe?: { dice?: DiceApiLike; measure?: MeasureApiLike } };
  };

  return globalScope.game;
}

export interface ClashParticipant {
  id: string;
  name?: string;
  token?: unknown;
}

export interface ClashResult {
  attackerRoll: number;
  defenderRoll: number;
  attackerWins: boolean;
  damage: number;
}

export interface ResolveClashOptions {
  dice?: DiceApiLike;
  measure?: MeasureApiLike;
}

/**
 * >>> ENGINE TOLERANCE, NOT A RULE. <<<
 *
 * The QSR says "bases are touching" and says nothing whatsoever about an
 * epsilon -- on a tabletop, two bases either touch or they do not. This number
 * has no rulebook source, so it deliberately does NOT live in constants.ts,
 * whose contract is "GREATHELM numbers, sourced from GREATHELM-QSR.pdf v0.4".
 * Filing it beside SPRINT_MOVE_INCHES would dress up a VTT artefact as a rule.
 * `MAX_INITIATIVE_TIE_REROLLS` in ../ui/round-control.ts is the precedent for
 * a non-rule constant living next to the code that needs it.
 *
 * Why it must exist at all: Foundry stores a token's x/y as INTEGER pixels,
 * while a base diameter is an irrational-in-pixels quantity (a 32mm base on a
 * 100px/in, 25mm grid is 125.98425196850394px). Two 32mm bases can therefore
 * never be placed at exactly one base-diameter apart. Measured live: centres
 * 126px apart -> base-to-base 0.0001574803149606563", not 0. The old
 * `distance === 0` test made base contact a measure-zero event -- it fired
 * essentially never, so a whole round could spend fourteen dice and deal zero
 * damage and run zero courage tests. Base contact is GREATHELM's *only*
 * spatial relation (vault/greathelm/base-contact-and-engagement.md), so a
 * contact test that cannot fire is a game that does not work.
 *
 * Why PIXELS and not inches: the error source is integer rounding of pixel
 * positions, so the worst case is bounded in pixels, not in game units.
 * Rounding x and y to integers displaces one token's centre by at most 0.5px
 * per axis, i.e. hypot(0.5, 0.5) ~= 0.707px; two tokens compound to ~1.414px
 * worst case. 2px covers that with margin and nothing more. An inch value
 * would be scene-dependent and wrong on half of them: 2px is 0.02" on a
 * 100px/in scene but 0.04" on a 50px/in one -- the same *visual* slop either
 * way, which is the property we actually want. It is also small enough to stay
 * invisible: 2px is well under the width of the line Foundry draws around a
 * token, so knights can never appear to trade blows across a visible gap.
 */
export const BASE_CONTACT_TOLERANCE_PX = 2;

/**
 * Fallback scale for `pxPerSceneUnit` when a token carries no readable scene
 * (plain-object tokens in tests, and any caller that has not gone through
 * round-control's `gatherKnightsFromCanvas`). 100 is Foundry's default
 * `grid.size` at `grid.distance = 1`, so the fallback tolerance is 0.02 scene
 * units. Guessing a scale is defensible only because the consequence is
 * bounded at hundredths of an inch either way; every real canvas token reports
 * its own scene and never reaches this line.
 */
const DEFAULT_PX_PER_SCENE_UNIT = 100;

/** The slice of round-control's token object that carries the scene scale. */
interface SceneScaledTokenLike {
  scene?: { grid?: { size?: number; distance?: number } };
}

/**
 * Pixels per one unit of scene grid distance -- the same conversion the core
 * measurement service applies (packages/battleframe/src/measurement/measure.ts
 * `pxPerUnit`). Read structurally and defensively rather than typed: this
 * package hands `unknown` tokens to `measure.between` on purpose, and reading
 * the scene here must not turn the token into a contract.
 *
 * Unit-agnostic by construction: `measure.between` reports its distance in
 * scene units, so dividing a pixel tolerance by this ratio lands in the same
 * units on an inches scene or a feet one, with no unit table of its own.
 */
function pxPerSceneUnit(token: unknown): number {
  const grid = (token as SceneScaledTokenLike | undefined)?.scene?.grid;
  const size = grid?.size;
  const distance = grid?.distance;

  if (typeof size !== "number" || typeof distance !== "number") {
    return DEFAULT_PX_PER_SCENE_UNIT;
  }

  if (!(size > 0) || !(distance > 0)) {
    return DEFAULT_PX_PER_SCENE_UNIT;
  }

  return size / distance;
}

/**
 * `BASE_CONTACT_TOLERANCE_PX` expressed in the scene units that
 * `measure.between` reports its distance in. Derived from the scene rather
 * than hardcoded, so the tolerance stays a constant number of pixels no matter
 * how the GM has scaled the board.
 */
export function baseContactToleranceUnits(token: unknown): number {
  return BASE_CONTACT_TOLERANCE_PX / pxPerSceneUnit(token);
}

/**
 * Whether an already-measured base-to-base distance counts as base contact.
 *
 * Split out from `isInBaseContact` so callers that have measured once and want
 * to reuse the number (round-control's `nearestEnemy` walk) apply exactly this
 * tolerance instead of re-deriving `=== 0` on their own -- there must be one
 * definition of "touching" in the ruleset, not four.
 *
 * `token` is only ever read for its scene scale; pass either side of the pair
 * (core's `assertSameMeasurementSpace` has already refused any pair whose grid
 * parameters differ, so both sides give the same answer).
 */
export function isBaseContactDistance(distance: number, token?: unknown): boolean {
  return distance <= baseContactToleranceUnits(token);
}

/**
 * QSR p1: Bash / Light Melee / Heavy Melee require base contact.
 *
 * Base contact is `measure.between(a, b) <= tolerance` -- there is no separate
 * engagement-range concept in GREATHELM, no zone of control and no free
 * strikes (vault/greathelm/base-contact-and-engagement.md). The rule is
 * "bases are touching"; the tolerance is the engine's admission that a
 * pixel-coordinate VTT cannot represent "touching" exactly. See
 * `BASE_CONTACT_TOLERANCE_PX`.
 */
export function isInBaseContact(
  measure: MeasureApiLike,
  tokenA: unknown,
  tokenB: unknown
): boolean {
  return isBaseContactDistance(measure.between(tokenA, tokenB).distance, tokenA);
}

function damageForAction(action: ActionId): number {
  switch (action) {
    case "light":
      return LIGHT_ATTACK_DAMAGE;
    case "heavy":
      return HEAVY_ATTACK_DAMAGE;
    default:
      // Bash deals no damage per QSR p2 -- it only strips momentum and
      // repositions the defender (see round/actions.ts describeAction).
      return 0;
  }
}

/**
 * Resolves a clash test: both sides roll 1d6 through the shared
 * `game.battleframe.dice.roll` API (which renders each roll to chat, see
 * ../../../battleframe/src/dice/dice.ts). Attacker wins ties (QSR p2,
 * verbatim: "Attacker wins if their total is equal to or higher than the
 * defender's").
 */
export async function resolveClashTest(
  action: ActionId,
  attacker: ClashParticipant,
  defender: ClashParticipant,
  options: ResolveClashOptions = {}
): Promise<ClashResult> {
  const dice = options.dice ?? resolveGame()?.battleframe?.dice;

  if (!dice) {
    throw new Error(`${MODULE_ID} | clash test requires game.battleframe.dice`);
  }

  const attackerRoll = await dice.roll(
    "1d6",
    {},
    { rulesetId: MODULE_ID, flavor: `${attacker.name ?? attacker.id} — ${action} clash test` }
  );
  const defenderRoll = await dice.roll(
    "1d6",
    {},
    { rulesetId: MODULE_ID, flavor: `${defender.name ?? defender.id} defends` }
  );

  const attackerWins = attackerRoll.total >= defenderRoll.total;

  return {
    attackerRoll: attackerRoll.total,
    defenderRoll: defenderRoll.total,
    attackerWins,
    damage: attackerWins ? damageForAction(action) : 0,
  };
}

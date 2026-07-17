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
 * QSR p1: Bash / Light Melee / Heavy Melee require base contact.
 * Base contact is `measure.between(a, b) === 0` -- there is no separate
 * engagement-range concept in GREATHELM (vault/greathelm/base-contact-and-engagement.md).
 */
export function isInBaseContact(
  measure: MeasureApiLike,
  tokenA: unknown,
  tokenB: unknown
): boolean {
  return measure.between(tokenA, tokenB).distance === 0;
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

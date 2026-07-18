import { battleframeNamespace } from "../api/index";
import { SYSTEM_ID } from "../constants";
import { postRollToChat } from "./chat";

declare global {
  interface BattleframeGameNamespace {
    dice?: DiceApi;
  }

  class Roll {
    formula: string;
    total: number;
    dice?: Array<{ results?: Array<{ result: number; active?: boolean }> }>;
    constructor(formula: string, data?: Record<string, unknown>);
    evaluate(options?: Record<string, unknown>): Promise<Roll>;
  }
}

export interface DiceRollOptions {
  rulesetId?: string;
  flavor?: string;
}

export interface DiceApi {
  roll(
    formula: string,
    data?: Record<string, unknown>,
    options?: DiceRollOptions
  ): Promise<Roll>;
  /**
   * Rolls a pool of `count` dice of `dieSize` as ONE `Roll` and ONE chat card
   * (not `count` separate rolls -- that spams chat and Dice So Nice), and
   * returns the individual die faces. A ruleset that reads faces (hits, saves)
   * off a pool uses this instead of looping `roll`.
   */
  rollPool(count: number, dieSize: number, options?: DiceRollOptions): Promise<number[]>;
}

/** The active die faces of an evaluated Roll's first dice term. */
function poolFaces(roll: Roll): number[] {
  const results = roll.dice?.[0]?.results ?? [];
  return results.filter((r) => r.active !== false).map((r) => r.result);
}

async function roll(
  formula: string,
  data?: Record<string, unknown>,
  options: DiceRollOptions = {}
): Promise<Roll> {
  const rollInstance = new Roll(formula, data);
  await rollInstance.evaluate();

  await postRollToChat({
    formula: rollInstance.formula,
    total: rollInstance.total,
    rulesetId: options.rulesetId ?? SYSTEM_ID,
    flavor: options.flavor,
    roll: rollInstance,
  });

  return rollInstance;
}

async function rollPool(
  count: number,
  dieSize: number,
  options: DiceRollOptions = {}
): Promise<number[]> {
  if (count <= 0) {
    return [];
  }
  const rollInstance = new Roll(`${count}d${dieSize}`);
  await rollInstance.evaluate();

  await postRollToChat({
    formula: rollInstance.formula,
    total: rollInstance.total,
    rulesetId: options.rulesetId ?? SYSTEM_ID,
    flavor: options.flavor,
    roll: rollInstance,
  });

  return poolFaces(rollInstance);
}

export function createDiceApi(): DiceApi {
  return { roll, rollPool };
}

/**
 * Installs onto the shared namespace, not onto `game` -- same reason as the
 * measurement api: `game` is absent at module top level, and the namespace
 * has to be reachable before any package's `init`. See ../api/index.
 */
export function installDiceApi(): DiceApi {
  const namespace = battleframeNamespace();
  namespace.dice = namespace.dice ?? createDiceApi();

  return namespace.dice;
}

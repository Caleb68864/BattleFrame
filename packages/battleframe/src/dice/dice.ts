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
  });

  return rollInstance;
}

export function createDiceApi(): DiceApi {
  return { roll };
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

import { rulesetRegistry } from "../rulesets/registry";
import type {
  ActivateResult,
  RegisterResult,
  RulesetDefinition,
} from "../rulesets/types";

export interface BattleframeApi {
  registerRuleset(def: RulesetDefinition): RegisterResult;
  activateRuleset(id: string): ActivateResult;
  getActiveRuleset(): RulesetDefinition | null;
  getRuleset(id: string): RulesetDefinition | null;
  listRulesets(): RulesetDefinition[];
}

export function createBattleframeApi(): BattleframeApi {
  return {
    registerRuleset: (def) => rulesetRegistry.registerRuleset(def),
    activateRuleset: (id) => rulesetRegistry.activateRuleset(id),
    getActiveRuleset: () => rulesetRegistry.getActiveRuleset(),
    getRuleset: (id) => rulesetRegistry.getRuleset(id),
    listRulesets: () => rulesetRegistry.listRulesets(),
  };
}

declare global {
  interface BattleframeGameNamespace {
    api: BattleframeApi;
  }

  // eslint-disable-next-line no-var
  var game:
    | {
        battleframe?: BattleframeGameNamespace;
        [key: string]: unknown;
      }
    | undefined;
}

export function installBattleframeApi(): BattleframeApi {
  const api = createBattleframeApi();

  if (typeof game !== "undefined" && game) {
    game.battleframe = { ...(game.battleframe ?? {}), api };
  }

  return api;
}

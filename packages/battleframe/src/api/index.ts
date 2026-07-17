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

  // The namespace lives on globalThis from module top level onward; `game`
  // only gains a reference to it at `init`. See battleframeNamespace().
  // eslint-disable-next-line no-var
  var battleframe: BattleframeGameNamespace | undefined;

  // eslint-disable-next-line no-var
  var game:
    | {
        battleframe?: BattleframeGameNamespace;
        [key: string]: unknown;
      }
    | undefined;
}

interface GlobalScope {
  battleframe?: BattleframeGameNamespace;
  game?: { battleframe?: BattleframeGameNamespace; [key: string]: unknown };
}

function globalScope(): GlobalScope {
  return globalThis as unknown as GlobalScope;
}

/**
 * Returns the one battleframe namespace object, creating it on first call.
 *
 * This is the load-order trick, copied from dnd5e (see
 * vault/foundry-systems/settings-and-api-namespace-conventions.md): the
 * namespace is built at **module top level**, so it exists before *anyone's*
 * `init` runs, whatever order Foundry loaded the packages in. Crucially it is
 * built without touching `game` -- at top-level evaluation `game` does not
 * exist yet, which is exactly why the object has to live on `globalThis`
 * first and get bound to `game` later (bindBattleframeNamespace, at `init`).
 *
 * Foundry publishes no package load-order contract, so "the system's `init`
 * runs first" is an assumption, not a guarantee. Building here depends on
 * nothing but module evaluation, which is ordered by imports.
 */
export function battleframeNamespace(): BattleframeGameNamespace {
  const scope = globalScope();
  const namespace = scope.battleframe ?? { api: createBattleframeApi() };
  scope.battleframe = namespace;

  // Opportunistic attach. At module top level `game` is undefined and this is
  // skipped -- which is the whole reason the namespace lives on globalThis.
  // Any call made once `game` does exist points it at the *same object*, so
  // `game.battleframe` never becomes a stale copy of a namespace someone else
  // has since added to. The full dnd5e merge onto `game.system` is
  // bindBattleframeNamespace's job, at `init`.
  if (scope.game && scope.game.battleframe !== namespace) {
    scope.game.battleframe = namespace;
  }

  return namespace;
}

/**
 * Binds the namespace to `game`, the way dnd5e does at its own `init`:
 *
 *   globalThis.dnd5e = game.dnd5e = Object.assign(game.system, globalThis.dnd5e);
 *
 * Merging onto `game.system` makes `globalThis.battleframe`,
 * `game.battleframe` and `game.system` the same object, so a consumer that
 * reached for any of them gets the same api. `game.system.api` is not an
 * official Foundry mechanism -- there is no official mechanism at all -- but
 * it is what the one shipping system that proves this pattern does.
 *
 * Callable before `game` exists: it simply leaves the globalThis namespace as
 * the only binding, which is still fully usable.
 */
export function bindBattleframeNamespace(): BattleframeGameNamespace {
  const namespace = battleframeNamespace();
  const scope = globalScope();
  const gameRef = scope.game;

  if (!gameRef) {
    return namespace;
  }

  // `game.system` is the system's own package object. Absent it (tests, or a
  // Foundry that changed shape), the namespace object itself is the target --
  // binding must not depend on a property nothing guarantees.
  const target = (gameRef.system as BattleframeGameNamespace | undefined) ?? namespace;
  const bound = Object.assign(target, namespace);

  scope.battleframe = bound;
  gameRef.battleframe = bound;

  return bound;
}

export function installBattleframeApi(): BattleframeApi {
  return battleframeNamespace().api;
}

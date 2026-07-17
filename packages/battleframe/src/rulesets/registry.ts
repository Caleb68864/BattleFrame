import type {
  ActivateResult,
  RegisterResult,
  RulesetDefinition,
} from "./types";
import { validateRulesetDefinition } from "./validate";

const RUNNING_BATTLEFRAME_VERSION = "0.1.0";

function callHook(hook: string, ...args: unknown[]): void {
  if (typeof Hooks === "undefined") {
    return;
  }

  const hooks = Hooks as unknown as {
    callAll?: (name: string, ...hookArgs: unknown[]) => void;
  };
  hooks.callAll?.(hook, ...args);
}

export class RulesetRegistry {
  private readonly rulesets = new Map<string, RulesetDefinition>();

  private activeId: string | null = null;

  registerRuleset(def: RulesetDefinition): RegisterResult {
    try {
      const errors = validateRulesetDefinition(
        def,
        Array.from(this.rulesets.keys()),
        RUNNING_BATTLEFRAME_VERSION
      );

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      this.rulesets.set(def.id, def);
      callHook("battleframe.rulesetRegistered", def);

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errors: [`Unexpected error registering ruleset: ${message}`] };
    }
  }

  activateRuleset(id: string): ActivateResult {
    const def = this.rulesets.get(id);

    if (!def) {
      return { ok: false, errors: [`Ruleset "${id}" is not registered.`] };
    }

    if (def.primary && this.activeId && this.activeId !== id) {
      const activeDef = this.rulesets.get(this.activeId);

      if (activeDef?.primary) {
        return {
          ok: false,
          errors: [
            `Cannot activate primary ruleset "${id}": primary ruleset "${activeDef.id}" is already active.`,
          ],
        };
      }
    }

    this.activeId = id;
    callHook("battleframe.rulesetActivated", def);

    return { ok: true };
  }

  getActiveRuleset(): RulesetDefinition | null {
    if (!this.activeId) {
      return null;
    }

    return this.rulesets.get(this.activeId) ?? null;
  }

  getRuleset(id: string): RulesetDefinition | null {
    return this.rulesets.get(id) ?? null;
  }

  listRulesets(): RulesetDefinition[] {
    return Array.from(this.rulesets.values());
  }
}

export const rulesetRegistry = new RulesetRegistry();

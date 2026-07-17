import { SYSTEM_ID } from "../constants";
import { rulesetRegistry } from "../rulesets/registry";
import type { RulesetDefinition } from "../rulesets/types";
import {
  getActiveRulesetId,
  isSetupCompleted,
  setActiveRulesetId,
  setSetupCompleted,
} from "../settings";

export interface RulesetSummary {
  id: string;
  title: string;
  version: string;
  compatibility: string;
  primary: boolean;
}

export interface WizardStateEmpty {
  state: "empty";
}

export interface WizardStateConflict {
  state: "conflict";
  conflictingIds: string[];
  rulesets: RulesetSummary[];
}

export interface WizardStateReady {
  state: "ready";
  rulesets: RulesetSummary[];
}

export type WizardState = WizardStateEmpty | WizardStateConflict | WizardStateReady;

function summarize(def: RulesetDefinition): RulesetSummary {
  return {
    id: def.id,
    title: def.title,
    version: def.version,
    compatibility: `${def.battleframeCompatibility.minimum}+ (verified ${def.battleframeCompatibility.verified})`,
    primary: def.primary,
  };
}

/**
 * Turns the raw list of registered rulesets into the wizard's tri-state
 * view: nothing installed, two `primary: true` rulesets fighting over the
 * seat, or a normal ready-to-choose list. The conflict state must be
 * surfaced before anything is allowed to activate.
 */
export function evaluateWizardState(rulesets: readonly RulesetDefinition[]): WizardState {
  if (rulesets.length === 0) {
    return { state: "empty" };
  }

  const primaryDefs = rulesets.filter((def) => def.primary);

  if (primaryDefs.length > 1) {
    return {
      state: "conflict",
      conflictingIds: primaryDefs.map((def) => def.id),
      rulesets: rulesets.map(summarize),
    };
  }

  return { state: "ready", rulesets: rulesets.map(summarize) };
}

/**
 * A world with setup already completed never auto-opens the wizard for a
 * player, even if setup is somehow incomplete server-side -- only a GM can
 * be trusted to resolve ruleset ambiguity.
 */
export function shouldAutoOpenWizard(isGM: boolean, setupCompleted: boolean): boolean {
  return isGM && !setupCompleted;
}

export interface ActivateSelectionResult {
  ok: boolean;
  errors?: string[];
}

/**
 * Order matters: `activateRuleset` must succeed before the world setting is
 * written. Writing the setting first (and activation failing after) leaves
 * a world pointed at a ruleset that never actually activated -- a state
 * that survives reloads and looks like corruption.
 */
export async function activatePrimarySelection(id: string): Promise<ActivateSelectionResult> {
  const result = rulesetRegistry.activateRuleset(id);

  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  await setActiveRulesetId(id);
  await setSetupCompleted(true);

  return { ok: true };
}

export type ActorSheetV2BaseConstructor = new (...args: any[]) => Record<string, unknown>;

type HandlebarsApplicationMixinFn = (
  base: ActorSheetV2BaseConstructor
) => ActorSheetV2BaseConstructor;

function resolveFoundryApplicationApi(): {
  ApplicationV2?: ActorSheetV2BaseConstructor;
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn;
} {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        api?: {
          ApplicationV2?: ActorSheetV2BaseConstructor;
          HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn;
        };
      };
    };
  };

  return {
    ApplicationV2: globalScope.foundry?.applications?.api?.ApplicationV2,
    HandlebarsApplicationMixin: globalScope.foundry?.applications?.api?.HandlebarsApplicationMixin,
  };
}

export class MissingApplicationV2BaseError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | no ApplicationV2 base class found on ` +
        "foundry.applications.api.ApplicationV2"
    );
    this.name = "MissingApplicationV2BaseError";
  }
}

/**
 * Builds the `SetupWizard` ApplicationV2 class. First-launch wizard that
 * lists installed rulesets, refuses to activate anything while two
 * primaries are in conflict, and explains the zero-ruleset case as a real
 * product state rather than an error.
 */
export function createSetupWizardClass(
  ApplicationV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const resolved = resolveFoundryApplicationApi();
  const base = ApplicationV2Base ?? resolved.ApplicationV2;
  const mixin = HandlebarsApplicationMixin ?? resolved.HandlebarsApplicationMixin;

  if (!base) {
    throw new MissingApplicationV2BaseError();
  }

  const MixedBase = mixin ? mixin(base) : base;

  class SetupWizard extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${SYSTEM_ID}-setup-wizard`,
      classes: [SYSTEM_ID, "setup-wizard"],
      window: { title: "battleframe.setupWizard.title" },
      position: { width: 520, height: 480 },
      actions: {
        "select-primary": SetupWizard.prototype.onSelectPrimary,
      },
    };

    static PARTS = {
      form: { template: `systems/${SYSTEM_ID}/templates/setup-wizard.hbs` },
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function"
          ? await super._prepareContext(options)
          : {};

      const wizardState = evaluateWizardState(rulesetRegistry.listRulesets());
      context.wizardState = wizardState;
      context.activeRulesetId = getActiveRulesetId();

      return context;
    }

    async onSelectPrimary(event: unknown, target: { dataset?: { rulesetId?: string } }): Promise<void> {
      const id = target?.dataset?.rulesetId;
      if (!id) {
        return;
      }

      const wizardState = evaluateWizardState(rulesetRegistry.listRulesets());
      if (wizardState.state === "conflict") {
        return;
      }

      const result = await activatePrimarySelection(id);
      if (result.ok && typeof (this as unknown as { render?: (force?: boolean) => void }).render === "function") {
        (this as unknown as { render: (force?: boolean) => void }).render(true);
      }
    }
  }

  return SetupWizard as unknown as ActorSheetV2BaseConstructor;
}

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

function currentUser(): { isGM?: boolean } | undefined {
  const globalScope = globalThis as unknown as { game?: { user?: { isGM?: boolean } } };
  return globalScope.game?.user;
}

/**
 * Opens the setup wizard automatically for a GM whenever setup is
 * incomplete -- and never for a player, regardless of setup state.
 */
export function openWizardIfNeeded(): void {
  const user = currentUser();
  const isGM = user?.isGM === true;

  if (!shouldAutoOpenWizard(isGM, isSetupCompleted())) {
    return;
  }

  const WizardClass = createSetupWizardClass();
  const wizard = new (WizardClass as unknown as new () => { render: (force?: boolean) => void })();
  wizard.render(true);
}

if (hooksAvailable()) {
  Hooks.once("ready", () => {
    openWizardIfNeeded();
  });
}

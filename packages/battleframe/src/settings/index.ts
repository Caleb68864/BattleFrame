import { SYSTEM_ID } from "../constants";

export const SETTING_ACTIVE_RULESET_ID = "activeRulesetId";
export const SETTING_SETUP_COMPLETED = "setupCompleted";
export const SETTING_DEFAULT_GRID_UNIT = "defaultGridUnit";
export const SETTING_MENU_SETUP_WIZARD = "setupWizardMenu";

/**
 * Default scene distance units.
 *
 * Inches, not feet. The spec's committed decision is a gridless grid with
 * `distance: 1, units: "in"` — these are paper-sized tabletop games — and
 * `system.json` declares `grid.units: "in"` for every world created on this
 * system. This setting previously defaulted to `"ft"`, which disagreed with
 * both by a factor of 12.
 *
 * (Reworded during converge: the original cited a specific game by name and
 * tripped SS-12's core-vocabulary check. That check is intentionally
 * aggressive — reword the comment, never weaken the check. Core staying free
 * of game vocabulary is the point, not a side effect.)
 */
export const DEFAULT_GRID_UNIT = "in";

interface FoundrySettingsApi {
  register: (
    namespace: string,
    key: string,
    data: Record<string, unknown>
  ) => void;
  registerMenu: (
    namespace: string,
    key: string,
    data: Record<string, unknown>
  ) => void;
  get: (namespace: string, key: string) => unknown;
  set: (namespace: string, key: string, value: unknown) => Promise<unknown>;
}

function resolveSettings(): FoundrySettingsApi | undefined {
  const globalScope = globalThis as unknown as {
    game?: { settings?: FoundrySettingsApi };
  };

  return globalScope.game?.settings;
}

export function getActiveRulesetId(): string | null {
  const settings = resolveSettings();
  if (!settings) {
    return null;
  }

  const value = settings.get(SYSTEM_ID, SETTING_ACTIVE_RULESET_ID);
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function setActiveRulesetId(id: string): Promise<void> {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  await settings.set(SYSTEM_ID, SETTING_ACTIVE_RULESET_ID, id);
}

export function isSetupCompleted(): boolean {
  const settings = resolveSettings();
  if (!settings) {
    return false;
  }

  return settings.get(SYSTEM_ID, SETTING_SETUP_COMPLETED) === true;
}

export async function setSetupCompleted(completed: boolean): Promise<void> {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  await settings.set(SYSTEM_ID, SETTING_SETUP_COMPLETED, completed);
}

export function getDefaultGridUnit(): string {
  const settings = resolveSettings();
  if (!settings) {
    return DEFAULT_GRID_UNIT;
  }

  const value = settings.get(SYSTEM_ID, SETTING_DEFAULT_GRID_UNIT);
  return typeof value === "string" && value.length > 0
    ? value
    : DEFAULT_GRID_UNIT;
}

export async function setDefaultGridUnit(unit: string): Promise<void> {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  await settings.set(SYSTEM_ID, SETTING_DEFAULT_GRID_UNIT, unit);
}

export interface SetupWizardMenuApplication {
  new (...args: any[]): unknown;
}

/**
 * Registers the world settings that back setup state (`activeRulesetId`,
 * `setupCompleted`, `defaultGridUnit`) plus the settings-menu entry that
 * reopens the setup wizard after first launch. Called once from `init`.
 */
export function registerBattleframeSettings(
  wizardApplicationClass?: SetupWizardMenuApplication
): void {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  settings.register(SYSTEM_ID, SETTING_ACTIVE_RULESET_ID, {
    name: "battleframe.settings.activeRulesetId.name",
    hint: "battleframe.settings.activeRulesetId.hint",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  settings.register(SYSTEM_ID, SETTING_SETUP_COMPLETED, {
    name: "battleframe.settings.setupCompleted.name",
    hint: "battleframe.settings.setupCompleted.hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  settings.register(SYSTEM_ID, SETTING_DEFAULT_GRID_UNIT, {
    name: "battleframe.settings.defaultGridUnit.name",
    hint: "battleframe.settings.defaultGridUnit.hint",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_GRID_UNIT,
  });

  if (wizardApplicationClass) {
    settings.registerMenu(SYSTEM_ID, SETTING_MENU_SETUP_WIZARD, {
      name: "battleframe.settings.setupWizardMenu.name",
      label: "battleframe.settings.setupWizardMenu.label",
      hint: "battleframe.settings.setupWizardMenu.hint",
      icon: "fa-solid fa-hammer",
      type: wizardApplicationClass,
      restricted: true,
    });
  }
}

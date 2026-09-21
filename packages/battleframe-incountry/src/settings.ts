import { DIE_SIZE_UNSET, MODULE_ID, SETTING_DIE_SIZE } from "./constants";

/**
 * The module's world settings: the numbers the user supplies once, rather than
 * per unit.
 *
 * Only one lives here today -- the die size that used to be a shipped constant.
 * It is deliberately awkward to read: `requireDieSize` throws rather than
 * falling back, because a fallback is how a stripped rules number comes back.
 */

interface FoundrySettingsApi {
  register: (namespace: string, key: string, data: Record<string, unknown>) => void;
  get: (namespace: string, key: string) => unknown;
}

function resolveSettings(): FoundrySettingsApi | undefined {
  const globalScope = globalThis as unknown as {
    game?: { settings?: FoundrySettingsApi };
  };
  return globalScope.game?.settings;
}

/** Raised when a roll is attempted in a world that has not chosen its die. */
export class DieSizeNotSetError extends Error {
  constructor() {
    super(
      `${MODULE_ID} | no die size set. This module ships no rules numbers: ` +
        `open the module settings and enter the die your rulebook uses.`
    );
    this.name = "DieSizeNotSetError";
  }
}

export function registerSettings(): void {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  settings.register(MODULE_ID, SETTING_DIE_SIZE, {
    name: `${MODULE_ID}.settings.dieSize.name`,
    hint: `${MODULE_ID}.settings.dieSize.hint`,
    scope: "world",
    config: true,
    type: Number,
    default: DIE_SIZE_UNSET
  });
}

/**
 * The die size this world uses, or {@link DIE_SIZE_UNSET} when nobody has said.
 *
 * Returns the unset value rather than throwing so a sheet can render, and a
 * settings form can show the gap, without a roll being attempted.
 */
export function getDieSize(): number {
  const settings = resolveSettings();
  if (!settings) {
    return DIE_SIZE_UNSET;
  }

  const value = settings.get(MODULE_ID, SETTING_DIE_SIZE);
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : DIE_SIZE_UNSET;
}

/**
 * The die size, or a refusal.
 *
 * Every roll path goes through this. The point is that there is no number here
 * to fall back to -- if this returned a plausible default, the published value
 * this module was stripped of would simply live at this line instead.
 *
 * @throws {DieSizeNotSetError} When the world has not set a die size.
 */
export function requireDieSize(): number {
  const dieSize = getDieSize();
  if (dieSize === DIE_SIZE_UNSET) {
    throw new DieSizeNotSetError();
  }
  return dieSize;
}

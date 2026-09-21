import {
  MODULE_ID,
  SETTING_RULES_PROFILE,
  type ActionId,
  type DieFace,
  ACTION_IDS,
  DIE_FACES
} from "./constants";

/**
 * The numbers this module used to ship, as a profile the user fills in.
 *
 * GREATHELM's rules numbers lived in `constants.ts` until the rules-content
 * audit (`docs/rules-content-audit.md`). They were read out of a rulebook, and
 * the repository's own `.gitignore` already scrubbed that rulebook from
 * tracking *and history* on the grounds that it was "never redistributable
 * anyway -- copyrighted". The PDF was handled; the numbers taken out of it were
 * not. This is where they go instead: a profile the owner of the rulebook types
 * in, or imports as a file, once.
 *
 * What stayed behind in `constants.ts` is the module's own vocabulary -- the six
 * action ids and the six die faces. Those are the shape of the game this module
 * implements, not values it asserts, and a profile that could rename them would
 * be a different module rather than a configured one.
 *
 * Ships {@link BLANK_PROFILE}. Nothing here has a working default, on purpose:
 * see {@link requireProfile}.
 */

/** What one action does when its face is spent. Every field optional; a blank action does nothing. */
export interface ActionEffectProfile {
  /** Inches this action may move. */
  moveInches?: number;
  /** Momentum this action gains. */
  momentumGain?: number;
  /** Damage this action deals on a successful clash. */
  damage?: number;
  /** Whether this action strips the defender's momentum and repositions them. */
  stripsDefenderMomentum?: boolean;
}

export interface RulesProfile {
  /** Added to the count of knights in play to size the initiative pool. */
  dicePoolPerKnightBonus: number;
  /** The pool a fresh warband opens with. */
  openingDicePoolSize: number;
  /** The floor applied when the optional minimum-pool setting is on. */
  minDicePoolFloor: number;
  /** Which action each die face buys. A face with no entry buys nothing. */
  faceToAction: Partial<Record<DieFace, ActionId>>;
  /** The actions that need a clash test rather than succeeding outright. */
  clashTestActions: readonly ActionId[];
  /** What each action does. */
  actions: Partial<Record<ActionId, ActionEffectProfile>>;
}

/**
 * The profile as shipped: no numbers, no mapping, no clash list.
 *
 * Every value is zero or empty rather than plausible. A profile that arrived
 * half-filled with the published values would make the strip cosmetic -- the
 * numbers would simply live at this line instead of in `constants.ts` -- and it
 * would be invisible, because a module that works out of the box is exactly
 * what nobody investigates.
 */
export const BLANK_PROFILE: RulesProfile = Object.freeze({
  dicePoolPerKnightBonus: 0,
  openingDicePoolSize: 0,
  minDicePoolFloor: 0,
  faceToAction: Object.freeze({}),
  clashTestActions: Object.freeze([]),
  actions: Object.freeze({})
}) as RulesProfile;

/** Raised when the module is asked to play in a world that has entered no numbers. */
export class RulesProfileNotSetError extends Error {
  constructor(what: string) {
    super(
      `${MODULE_ID} | this module ships no rules numbers, and this world has not ` +
        `entered ${what}. Open the module settings and fill in the rules profile, ` +
        `or import one, using the rulebook you own.`
    );
    this.name = "RulesProfileNotSetError";
  }
}

/** Raised when an imported profile is not one. */
export class RulesProfileInvalidError extends Error {
  constructor(reason: string) {
    super(`${MODULE_ID} | that is not a rules profile: ${reason}`);
    this.name = "RulesProfileInvalidError";
  }
}

interface FoundrySettingsApi {
  register: (namespace: string, key: string, data: Record<string, unknown>) => void;
  get: (namespace: string, key: string) => unknown;
  set: (namespace: string, key: string, value: unknown) => Promise<unknown>;
}

function resolveSettings(): FoundrySettingsApi | undefined {
  const globalScope = globalThis as unknown as {
    game?: { settings?: FoundrySettingsApi };
  };
  return globalScope.game?.settings;
}

export function registerRulesProfileSetting(): void {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  settings.register(MODULE_ID, SETTING_RULES_PROFILE, {
    name: `${MODULE_ID}.settings.rulesProfile.name`,
    hint: `${MODULE_ID}.settings.rulesProfile.hint`,
    scope: "world",
    config: false,
    type: Object,
    default: BLANK_PROFILE
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function wholeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

/**
 * Reads an arbitrary value as a profile, keeping only what it recognises.
 *
 * Unknown action ids and out-of-range faces are dropped rather than carried:
 * the profile is the user's, but the vocabulary is the module's, and a stored
 * profile naming an action this module has never heard of would surface as an
 * undefined effect somewhere far away from the import that accepted it.
 */
export function normalizeProfile(value: unknown): RulesProfile {
  if (!isPlainObject(value)) {
    return BLANK_PROFILE;
  }

  const faceToAction: Partial<Record<DieFace, ActionId>> = {};
  if (isPlainObject(value.faceToAction)) {
    for (const face of DIE_FACES) {
      const action = value.faceToAction[String(face)];
      if (typeof action === "string" && (ACTION_IDS as readonly string[]).includes(action)) {
        faceToAction[face] = action as ActionId;
      }
    }
  }

  const clashTestActions = Array.isArray(value.clashTestActions)
    ? value.clashTestActions.filter(
        (id): id is ActionId =>
          typeof id === "string" && (ACTION_IDS as readonly string[]).includes(id)
      )
    : [];

  const actions: Partial<Record<ActionId, ActionEffectProfile>> = {};
  if (isPlainObject(value.actions)) {
    for (const id of ACTION_IDS) {
      const entry = value.actions[id];
      if (!isPlainObject(entry)) {
        continue;
      }
      const effect: ActionEffectProfile = {};
      if (entry.moveInches !== undefined) effect.moveInches = wholeNumber(entry.moveInches);
      if (entry.momentumGain !== undefined) effect.momentumGain = wholeNumber(entry.momentumGain);
      if (entry.damage !== undefined) effect.damage = wholeNumber(entry.damage);
      if (entry.stripsDefenderMomentum !== undefined) {
        effect.stripsDefenderMomentum = entry.stripsDefenderMomentum === true;
      }
      actions[id] = effect;
    }
  }

  return {
    dicePoolPerKnightBonus: wholeNumber(value.dicePoolPerKnightBonus),
    openingDicePoolSize: wholeNumber(value.openingDicePoolSize),
    minDicePoolFloor: wholeNumber(value.minDicePoolFloor),
    faceToAction,
    clashTestActions,
    actions
  };
}

/** The world's profile, or {@link BLANK_PROFILE} where none has been entered. */
export function getProfile(): RulesProfile {
  const settings = resolveSettings();
  if (!settings) {
    return BLANK_PROFILE;
  }
  return normalizeProfile(settings.get(MODULE_ID, SETTING_RULES_PROFILE));
}

/** True when a profile carries enough to play: a face mapping and a pool bonus. */
export function isProfileComplete(profile: RulesProfile = getProfile()): boolean {
  return Object.keys(profile.faceToAction).length > 0 && profile.dicePoolPerKnightBonus > 0;
}

/**
 * The world's profile, or a refusal.
 *
 * Every rules read goes through this or through a named accessor below. There
 * is deliberately nothing to fall back to: a default here would be the
 * published number, one indirection further from the file it was removed from.
 *
 * @throws {RulesProfileNotSetError} When no profile has been entered.
 */
export function requireProfile(): RulesProfile {
  const profile = getProfile();
  if (!isProfileComplete(profile)) {
    throw new RulesProfileNotSetError("its rules profile");
  }
  return profile;
}

/**
 * Stores a profile, after reading it as one.
 *
 * This is the import path: hand it parsed JSON from a file the user wrote from
 * their own rulebook.
 *
 * @throws {RulesProfileInvalidError} When the payload is not a profile, or
 *   carries no usable face mapping.
 */
export async function importProfile(payload: unknown): Promise<RulesProfile> {
  if (!isPlainObject(payload)) {
    throw new RulesProfileInvalidError("it is not an object");
  }

  const profile = normalizeProfile(payload);
  if (Object.keys(profile.faceToAction).length === 0) {
    throw new RulesProfileInvalidError(
      "it maps no die face to an action, so nothing in it could be played"
    );
  }

  const settings = resolveSettings();
  if (!settings) {
    throw new RulesProfileInvalidError("there is no world to store it in");
  }

  await settings.set(MODULE_ID, SETTING_RULES_PROFILE, profile);
  return profile;
}

/**
 * A blank profile written out as a file the user can fill in.
 *
 * Every key the importer reads is present and every value is empty, so the
 * template tells the user what to supply without telling them what to put.
 */
export function profileTemplate(): string {
  return JSON.stringify(
    {
      dicePoolPerKnightBonus: 0,
      openingDicePoolSize: 0,
      minDicePoolFloor: 0,
      faceToAction: Object.fromEntries(DIE_FACES.map((face) => [face, ""])),
      clashTestActions: [],
      actions: Object.fromEntries(
        ACTION_IDS.map((id) => [
          id,
          { moveInches: 0, momentumGain: 0, damage: 0, stripsDefenderMomentum: false }
        ])
      )
    },
    null,
    2
  );
}

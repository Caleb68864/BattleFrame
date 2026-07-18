import {
  DEFAULT_ATTACK_TARGET_CHOICE,
  DEFAULT_FIRST_OR_SECOND_CHOICE,
  MODULE_ID,
  SETTING_PROMPT_ATTACK_TARGET,
  SETTING_PROMPT_FIRST_OR_SECOND,
} from "../constants";
import type { InitiativeOutcome } from "../round/dice-pool";

/**
 * The two QSR-confirmed player choices SS-13 defaulted away (see
 * vault/greathelm/open-questions.md and round-control.ts resolveFirstPlayer /
 * findDefenderInBaseContact): the initiative winner's first-or-second call,
 * and which touching enemy an attacker hits. Each gets its own settings
 * toggle (constants.ts SETTING_PROMPT_FIRST_OR_SECOND /
 * SETTING_PROMPT_ATTACK_TARGET); with a toggle off, the documented ENGINE
 * DEFAULT applies instead.
 *
 * `forced-first` is NOT one of these -- QSR p1 makes it a rule (a sole holder
 * of 6s has no choice at all), so promptFirstOrSecond below never opens a
 * dialog for it.
 */

export type FirstOrSecondChoice = "first" | "second";

export interface WorldSettingsLike {
  get: (namespace: string, key: string) => unknown;
}

export interface AttackTargetCandidate {
  id: string;
  name?: string;
}

interface DialogButtonSpec {
  id: string;
  label: string;
}

interface DialogChooseOptions {
  title: string;
  content: string;
  buttons: DialogButtonSpec[];
}

/**
 * The seam every prompt dialog goes through, so tests never need a canvas or
 * a real DialogV2. `choose` resolves to the id of the clicked button, or
 * `null`/`undefined` if the dialog was dismissed without a choice.
 */
export interface DialogChooserLike {
  choose: (options: DialogChooseOptions) => Promise<string | null | undefined>;
}

/**
 * Feature-detects Foundry's `DialogV2.wait`, same precedent as
 * packages/battleframe/src/rulesets/orphan-check.ts resolveConversionPrompt:
 * `DialogV2` has no vault note at any confidence (see the SS-04 [HUMAN
 * REVIEW] criterion), so this asserts nothing about its shape beyond "is it a
 * function", wraps every call in a try/catch, and returns `undefined` -- never
 * throws -- when the API is absent or broken. Callers fall back to the
 * documented default and log; a round must never block on a dialog.
 */
export function resolveDialogChooser(): DialogChooserLike | undefined {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        api?: {
          DialogV2?: { wait?: (options: Record<string, unknown>) => Promise<unknown> };
        };
      };
    };
  };

  const dialogV2Wait = globalScope.foundry?.applications?.api?.DialogV2?.wait;

  if (typeof dialogV2Wait !== "function") {
    return undefined;
  }

  return {
    choose: async ({ title, content, buttons }) => {
      const result = await dialogV2Wait({
        window: { title },
        content,
        modal: true,
        buttons: buttons.map((button) => ({ action: button.id, label: button.label })),
      });

      return typeof result === "string" ? result : null;
    },
  };
}

function settingEnabled(settings: WorldSettingsLike | undefined, key: string): boolean {
  // Both toggles default to true (constants.ts): a missing/undefined settings
  // service (e.g. before `init`, or in a unit test with no world) must not be
  // read as "disabled" -- only an explicit `false` does that.
  return settings === undefined || settings.get(MODULE_ID, key) !== false;
}

function localize(key: string, fallback: string): string {
  const globalScope = globalThis as unknown as {
    game?: { i18n?: { localize?: (key: string) => string } };
  };
  const localized = globalScope.game?.i18n?.localize?.(key);

  return localized && localized !== key ? localized : fallback;
}

function log(message: string): void {
  console.log(`${MODULE_ID} | ${message}`);
}

export interface PromptFirstOrSecondOptions {
  outcome: InitiativeOutcome;
  settings?: WorldSettingsLike;
  /** Override dialog resolution for tests; omit to use `resolveDialogChooser`. */
  dialog?: DialogChooserLike | null;
}

/**
 * QSR p1: the initiative winner chooses whether to go first or second. When
 * `outcome.result === "forced-first"` there is no choice -- the sole holder
 * of 6s is forced first -- so this returns `"first"` WITHOUT ever opening a
 * dialog.
 *
 * With the prompt disabled (`SETTING_PROMPT_FIRST_OR_SECOND === false`), or
 * with no dialog API resolvable, `DEFAULT_FIRST_OR_SECOND_CHOICE` applies and
 * the fallback is logged rather than silently swallowed.
 */
export async function promptFirstOrSecond(
  options: PromptFirstOrSecondOptions
): Promise<FirstOrSecondChoice> {
  if (options.outcome.result === "forced-first") {
    return "first";
  }

  if (!settingEnabled(options.settings, SETTING_PROMPT_FIRST_OR_SECOND)) {
    return DEFAULT_FIRST_OR_SECOND_CHOICE;
  }

  const dialog = options.dialog === undefined ? resolveDialogChooser() : options.dialog;

  if (!dialog) {
    log(
      "no dialog API available for the first-or-second prompt; " +
        `defaulting to "${DEFAULT_FIRST_OR_SECOND_CHOICE}"`
    );

    return DEFAULT_FIRST_OR_SECOND_CHOICE;
  }

  try {
    const chosen = await dialog.choose({
      title: localize("battleframe-greathelm.prompts.firstOrSecond.title", "Go first or second?"),
      content: `<p>${localize(
        "battleframe-greathelm.prompts.firstOrSecond.body",
        "You won initiative. Go first or second?"
      )}</p>`,
      buttons: [
        { id: "first", label: localize("battleframe-greathelm.prompts.firstOrSecond.first", "First") },
        { id: "second", label: localize("battleframe-greathelm.prompts.firstOrSecond.second", "Second") },
      ],
    });

    return chosen === "second" ? "second" : "first";
  } catch (error) {
    log(
      "the first-or-second dialog failed; " +
        `defaulting to "${DEFAULT_FIRST_OR_SECOND_CHOICE}" (${
          error instanceof Error ? error.message : String(error)
        })`
    );

    return DEFAULT_FIRST_OR_SECOND_CHOICE;
  }
}

export interface PromptResetConfirmationOptions {
  /** Override dialog resolution for tests; omit to use `resolveDialogChooser`. */
  dialog?: DialogChooserLike | null;
}

/**
 * Confirms the destructive "New Battle" reset, which clears every knight's
 * wounds, momentum and flight. Returns `true` only on an explicit confirm.
 *
 * The no-dialog and error paths differ deliberately from the other prompts:
 * theirs fall back to a safe *game* default, but there is no safe default for a
 * reset -- a missing or broken confirmation must never be read as consent. So
 * both return `false` (do nothing) and log, and the reset simply does not run.
 */
export async function promptResetConfirmation(
  options: PromptResetConfirmationOptions = {}
): Promise<boolean> {
  const dialog = options.dialog === undefined ? resolveDialogChooser() : options.dialog;

  if (!dialog) {
    log("no dialog API available for the new-battle confirmation; not resetting");

    return false;
  }

  try {
    const chosen = await dialog.choose({
      title: localize("battleframe-greathelm.prompts.resetBattle.title", "Start a new battle?"),
      content: `<p>${localize(
        "battleframe-greathelm.prompts.resetBattle.body",
        "This clears every knight's wounds, momentum and flight. This cannot be undone."
      )}</p>`,
      buttons: [
        {
          id: "confirm",
          label: localize("battleframe-greathelm.prompts.resetBattle.confirm", "New Battle"),
        },
        {
          id: "cancel",
          label: localize("battleframe-greathelm.prompts.resetBattle.cancel", "Cancel"),
        },
      ],
    });

    return chosen === "confirm";
  } catch (error) {
    log(
      "the new-battle confirmation dialog failed; not resetting " +
        `(${error instanceof Error ? error.message : String(error)})`
    );

    return false;
  }
}

export interface PromptAttackTargetOptions<T extends AttackTargetCandidate> {
  /** Every enemy the attacker is in base contact with. GREATHELM has no separate engagement range. */
  candidates: readonly T[];
  settings?: WorldSettingsLike;
  dialog?: DialogChooserLike | null;
}

/**
 * Which touching enemy an attacker hits, when 2+ qualify. With exactly one
 * candidate there is nothing to choose -- no prompt, same shape as
 * `forced-first` above. With the prompt disabled, or no dialog API, the
 * documented default applies: the FIRST candidate (whatever order the caller
 * supplied, e.g. round-control.ts nearestEnemy) -- see
 * DEFAULT_ATTACK_TARGET_CHOICE and its settings hint in lang/en.json.
 */
export async function promptAttackTarget<T extends AttackTargetCandidate>(
  options: PromptAttackTargetOptions<T>
): Promise<T | undefined> {
  const { candidates } = options;

  if (candidates.length <= 1) {
    return candidates[0];
  }

  if (!settingEnabled(options.settings, SETTING_PROMPT_ATTACK_TARGET)) {
    return candidates[0];
  }

  const dialog = options.dialog === undefined ? resolveDialogChooser() : options.dialog;

  if (!dialog) {
    log(
      `no dialog API available for the attack-target prompt; defaulting to the ` +
        `"${DEFAULT_ATTACK_TARGET_CHOICE}" candidate in base contact`
    );

    return candidates[0];
  }

  try {
    const chosen = await dialog.choose({
      title: localize("battleframe-greathelm.prompts.attackTarget.title", "Which enemy?"),
      content: `<p>${localize(
        "battleframe-greathelm.prompts.attackTarget.body",
        "Multiple enemies are in base contact. Which one is this attack against?"
      )}</p>`,
      buttons: candidates.map((candidate) => ({ id: candidate.id, label: candidate.name ?? candidate.id })),
    });

    return candidates.find((candidate) => candidate.id === chosen) ?? candidates[0];
  } catch (error) {
    log(
      `the attack-target dialog failed; defaulting to the "${DEFAULT_ATTACK_TARGET_CHOICE}" ` +
        `candidate in base contact (${error instanceof Error ? error.message : String(error)})`
    );

    return candidates[0];
  }
}

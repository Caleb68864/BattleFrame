import { DIE_TYPES, MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";

export class MissingActorSheetV2BaseError extends Error {
  constructor() {
    super(
      `${MODULE_ID} | no ActorSheetV2 base class found on ` +
        "foundry.applications.sheets.ActorSheetV2"
    );
    this.name = "MissingActorSheetV2BaseError";
  }
}

export type ActorSheetV2BaseConstructor = new (...args: any[]) => {
  actor?: { system?: unknown };
};

type HandlebarsApplicationMixinFn = (
  base: ActorSheetV2BaseConstructor
) => ActorSheetV2BaseConstructor;

interface ActorLike {
  system?: { figures?: unknown[]; weapons?: unknown[] };
  update: (changes: Record<string, unknown>) => Promise<unknown>;
}

const DEFAULT_FIGURE = { name: "", armour: "d4", weaponId: "", wounds: 0, status: "ok" };
const DEFAULT_WEAPON = {
  id: "w1",
  label: "",
  firepower: 1,
  impact: "d8",
  rangeClass: "normal",
  isSupport: false,
  supportFpVsInfantry: "d8",
  supportFpVsPoint: "d8",
  ccShift: 0
};

async function pushRow(
  actor: ActorLike | undefined,
  path: "figures" | "weapons",
  row: Record<string, unknown>
): Promise<void> {
  if (!actor) {
    return;
  }
  const rows = [...(actor.system?.[path] ?? [])];
  rows.push({ ...row });
  await actor.update({ [`system.${path}`]: rows });
}

async function removeRow(
  actor: ActorLike | undefined,
  path: "figures" | "weapons",
  index: number
): Promise<void> {
  if (!actor) {
    return;
  }
  const rows = [...(actor.system?.[path] ?? [])];
  if (Number.isInteger(index) && index >= 0 && index < rows.length) {
    rows.splice(index, 1);
    await actor.update({ [`system.${path}`]: rows });
  }
}

/** Sheet actions, bound by ApplicationV2 with `this` = the sheet. */
async function onAddFigure(this: { actor?: ActorLike }): Promise<void> {
  await pushRow(this.actor, "figures", DEFAULT_FIGURE);
}
async function onRemoveFigure(
  this: { actor?: ActorLike },
  _event: Event,
  target: HTMLElement
): Promise<void> {
  await removeRow(this.actor, "figures", Number(target?.dataset?.index ?? -1));
}
async function onAddWeapon(this: { actor?: ActorLike }): Promise<void> {
  await pushRow(this.actor, "weapons", DEFAULT_WEAPON);
}
async function onRemoveWeapon(
  this: { actor?: ActorLike },
  _event: Event,
  target: HTMLElement
): Promise<void> {
  await removeRow(this.actor, "weapons", Number(target?.dataset?.index ?? -1));
}

function resolveFoundryApplications(): {
  ActorSheetV2?: ActorSheetV2BaseConstructor;
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn;
  DocumentSheetConfig?: {
    registerSheet: (
      documentClass: unknown,
      scope: string,
      sheetClass: unknown,
      options?: Record<string, unknown>
    ) => void;
  };
  ActorDocumentClass?: unknown;
} {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        sheets?: { ActorSheetV2?: ActorSheetV2BaseConstructor };
        api?: { HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn };
        apps?: {
          DocumentSheetConfig?: {
            registerSheet: (
              documentClass: unknown,
              scope: string,
              sheetClass: unknown,
              options?: Record<string, unknown>
            ) => void;
          };
        };
      };
    };
    CONFIG?: { Actor?: { documentClass?: unknown } };
  };

  return {
    ActorSheetV2: globalScope.foundry?.applications?.sheets?.ActorSheetV2,
    HandlebarsApplicationMixin: globalScope.foundry?.applications?.api?.HandlebarsApplicationMixin,
    DocumentSheetConfig: globalScope.foundry?.applications?.apps?.DocumentSheetConfig,
    ActorDocumentClass: globalScope.CONFIG?.Actor?.documentClass
  };
}

interface Option {
  value: string;
  label: string;
  selected: boolean;
}

/** Die-type `<select>` options with the current value flagged selected. */
export function dieOptions(selected: string): Option[] {
  return DIE_TYPES.map((value) => ({ value, label: value, selected: value === selected }));
}

/** Generic choice options with the current value flagged selected. */
export function choiceOptions(choices: readonly string[], selected: string): Option[] {
  return choices.map((value) => ({ value, label: value, selected: value === selected }));
}

const STATUS_CHOICES = ["ok", "wounded", "dead"] as const;
const RANGE_CLASS_CHOICES = ["normal", "close"] as const;
const MOTIVATION_CHOICES = ["low", "medium", "high"] as const;
const FATIGUE_CHOICES = ["fresh", "tired", "exhausted"] as const;

/**
 * Builds the sheet's render context: the raw system plus precomputed
 * option lists for every `<select>` (die types, statuses, range class,
 * motivation, fatigue) so the template stays free of Handlebars comparison
 * helpers. Pure + exported so the option shaping is unit-tested.
 */
export function buildUnitSheetContext(system: Record<string, unknown>): Record<string, unknown> {
  const figures = ((system.figures as Record<string, unknown>[]) ?? []).map((f, index) => ({
    ...f,
    index,
    armourOptions: dieOptions(String(f.armour ?? "d4")),
    statusOptions: choiceOptions(STATUS_CHOICES, String(f.status ?? "ok"))
  }));

  const weapons = ((system.weapons as Record<string, unknown>[]) ?? []).map((w, index) => ({
    ...w,
    index,
    impactOptions: dieOptions(String(w.impact ?? "d8")),
    rangeClassOptions: choiceOptions(RANGE_CLASS_CHOICES, String(w.rangeClass ?? "normal"))
  }));

  return {
    system,
    qualityOptions: dieOptions(String(system.quality ?? "d8")),
    motivationOptions: choiceOptions(MOTIVATION_CHOICES, String(system.missionMotivation ?? "medium")),
    fatigueOptions: choiceOptions(FATIGUE_CHOICES, String(system.fatigue ?? "fresh")),
    figures,
    weapons
  };
}

/**
 * Stargrunt II's unit sheet — the squad card: Quality die, leadership, the
 * confidence/suppression counters, posture toggles, an editable per-figure
 * roster (name + armour die + wounds + status), and user-defined weapon
 * profiles. ApplicationV2 via `HandlebarsApplicationMixin(ActorSheetV2)`,
 * `submitOnChange`, no self-`<form>` (the AppV2 root already is one).
 */
export function createUnitSheetClass(
  ActorSheetV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const resolved = resolveFoundryApplications();
  const base = ActorSheetV2Base ?? resolved.ActorSheetV2;
  const mixin = HandlebarsApplicationMixin ?? resolved.HandlebarsApplicationMixin;

  if (!base) {
    throw new MissingActorSheetV2BaseError();
  }

  const MixedBase = mixin ? mixin(base) : base;

  class UnitSheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-unit-sheet`,
      classes: [MODULE_ID, "sheet", "actor", UNIT_ACTOR_TYPE],
      position: { width: 520, height: 640 },
      form: { submitOnChange: true },
      actions: {
        addFigure: onAddFigure,
        removeFigure: onRemoveFigure,
        addWeapon: onAddWeapon,
        removeWeapon: onRemoveWeapon
      }
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/unit-sheet.hbs` }
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};

      const actor = (this as unknown as { actor?: { system?: Record<string, unknown> } }).actor;
      const system = (actor?.system ?? {}) as Record<string, unknown>;
      return { ...context, ...buildUnitSheetContext(system) };
    }
  }

  return UnitSheet as unknown as ActorSheetV2BaseConstructor;
}

/** Registers the unit sheet for `battleframe-stargrunt-ii.unit`. */
export function registerUnitSheet(): void {
  const resolved = resolveFoundryApplications();
  if (!resolved.DocumentSheetConfig || !resolved.ActorDocumentClass) {
    return;
  }
  resolved.DocumentSheetConfig.registerSheet(
    resolved.ActorDocumentClass,
    MODULE_ID,
    createUnitSheetClass(),
    {
      types: [`${MODULE_ID}.${UNIT_ACTOR_TYPE}`],
      makeDefault: true,
      label: "battleframe-stargrunt-ii.sheets.unit"
    }
  );
}

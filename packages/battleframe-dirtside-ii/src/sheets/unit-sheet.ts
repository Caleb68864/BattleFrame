import { MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";
import {
  mixedSheetBase,
  registerSheetFor,
  selectOptions,
  type ActorSheetV2BaseConstructor,
  type HandlebarsApplicationMixinFn,
} from "./base";

/**
 * The Dirtside II unit-grouping sheet (token-less actor): role, quality,
 * leadership, confidence + the command/activation markers. ApplicationV2,
 * `submitOnChange`. Elements join to this unit by the `unitId` flag, set when a
 * token is dropped (glue), not edited here.
 */
export function createUnitSheetClass(
  ActorSheetV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const MixedBase = mixedSheetBase(ActorSheetV2Base, HandlebarsApplicationMixin);

  class UnitSheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-unit-sheet`,
      classes: [MODULE_ID, "sheet", "actor", UNIT_ACTOR_TYPE],
      position: { width: 460, height: 480 },
      form: { submitOnChange: true },
      actions: {},
    };

    static PARTS = { form: { template: `modules/${MODULE_ID}/templates/unit-sheet.hbs` } };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};
      const system = ((this as any).actor?.system ?? {}) as Record<string, any>;
      context.system = system;
      context.roleOptions = selectOptions(
        ["combat", "battery"],
        system.role ?? "combat",
        `${MODULE_ID}.role`
      );
      context.qualityOptions = selectOptions(
        ["green", "regular", "veteran"],
        system.quality ?? "regular",
        `${MODULE_ID}.quality`
      );
      context.confidenceOptions = selectOptions(
        ["confident", "steady", "shaken", "broken"],
        system.confidence ?? "confident",
        `${MODULE_ID}.confidence`
      );
      return context;
    }
  }
  return UnitSheet as unknown as ActorSheetV2BaseConstructor;
}

export function registerUnitSheet(): void {
  registerSheetFor(UNIT_ACTOR_TYPE, createUnitSheetClass(), `${MODULE_ID}.sheets.unit`);
}

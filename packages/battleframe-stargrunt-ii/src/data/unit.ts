import { DIE_TYPES, MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";

export class MissingTypeDataModelBaseError extends Error {
  constructor() {
    super(
      `${MODULE_ID} | no TypeDataModel base class found on ` +
        "foundry.abstract.TypeDataModel"
    );
    this.name = "MissingTypeDataModelBaseError";
  }
}

export type TypeDataModelBaseConstructor = new (...args: any[]) => {
  name?: string;
  [key: string]: unknown;
};

function resolveTypeDataModelBase(): TypeDataModelBaseConstructor {
  const globalScope = globalThis as unknown as {
    foundry?: { abstract?: { TypeDataModel?: TypeDataModelBaseConstructor } };
  };
  const base = globalScope.foundry?.abstract?.TypeDataModel;
  if (!base) {
    throw new MissingTypeDataModelBaseError();
  }
  return base;
}

function resolveFieldsNamespace(): Record<string, any> {
  const globalScope = globalThis as unknown as {
    foundry?: { data?: { fields?: Record<string, any> } };
  };
  return globalScope.foundry?.data?.fields ?? {};
}

/** The die-type choices offered by every die StringField. */
const DIE_CHOICES = [...DIE_TYPES];

/**
 * The Stargrunt II infantry unit (squad/element). Neutrality: only fields the
 * user fills — no default stat values, no weapon/armour/points tables. Die
 * *types* are strings (`"d4".."d12"`) so shifts stay WYSIWYG; never store a die
 * as a number.
 *
 *  - `quality`      -- drives Range-Band size, the firer die, and every morale
 *                      roll, so it must be a die string.
 *  - `leadership`   -- LV 1..3 (1 = best); the number on the activation marker.
 *  - `figures[]`    -- the dice thrown AND the casualty surface (per-figure
 *                      armour + wounds), because SG2 allocates casualties to
 *                      individual figures rather than a model count.
 *  - `weapons[]`    -- user-defined weapon profiles (no stats shipped).
 *  - `confidence`   -- 0..4 morale ladder (4 = top rung).
 *  - `suppression`  -- 0..3 markers, surfaced as a badge on one status icon.
 *  - live posture booleans (`inPosition`/`disorganised`/`activated`).
 *  - scenario background (`missionMotivation`/`fatigue`) feeding the test system.
 */
export function createUnitDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class UnitData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const { NumberField, StringField, BooleanField, ArrayField, SchemaField } = fields;
      const schema: Record<string, unknown> = {};

      if (!NumberField) {
        return schema;
      }

      const intField = (min: number, initial: number, max?: number): unknown =>
        new NumberField({ required: true, nullable: false, integer: true, min, max, initial });

      // Identity / command — the activation marker (colour = quality, number = LV).
      schema.quality = new StringField({
        required: true,
        blank: false,
        choices: DIE_CHOICES,
        initial: "d8"
      });
      schema.leadership = intField(1, 2, 3);

      // Roster — figures are BOTH the dice thrown AND the casualty surface.
      if (ArrayField && SchemaField) {
        schema.figures = new ArrayField(
          new SchemaField({
            name: new StringField({ blank: true, initial: "" }),
            armour: new StringField({ choices: DIE_CHOICES, initial: "d4" }),
            weaponId: new StringField({ blank: true, initial: "" }),
            wounds: intField(0, 0, 2),
            status: new StringField({ choices: ["ok", "wounded", "dead"], initial: "ok" })
          }),
          { initial: [] }
        );

        // Weapons the user defines (no stats shipped).
        schema.weapons = new ArrayField(
          new SchemaField({
            id: new StringField({ blank: false, initial: "w1" }),
            label: new StringField({ blank: true, initial: "" }),
            firepower: new NumberField({ min: 0, initial: 1 }),
            impact: new StringField({ choices: DIE_CHOICES, initial: "d8" }),
            rangeClass: new StringField({ choices: ["normal", "close"], initial: "normal" }),
            isSupport: new BooleanField({ initial: false }),
            supportFpVsInfantry: new StringField({ choices: DIE_CHOICES, initial: "d8" }),
            supportFpVsPoint: new StringField({ choices: DIE_CHOICES, initial: "d8" }),
            ccShift: intField(0, 0, 2)
          }),
          { initial: [] }
        );
      }

      // Live morale / suppression / posture (counters stored as data, surfaced as badges).
      schema.confidence = intField(0, 4, 4);
      schema.suppression = intField(0, 0, 3);
      schema.inPosition = new BooleanField({ initial: false });
      schema.disorganised = new BooleanField({ initial: false });
      schema.activated = new BooleanField({ initial: false });

      // Scenario background (feeds the test system).
      schema.missionMotivation = new StringField({
        choices: ["low", "medium", "high"],
        initial: "medium"
      });
      schema.fatigue = new StringField({
        choices: ["fresh", "tired", "exhausted"],
        initial: "fresh"
      });

      return schema;
    }
  }

  return UnitData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-stargrunt-ii.unit` as an Actor data model at `init`, per
 * Foundry v14's `CONFIG.Actor.dataModels` path. Namespaced by module id so it
 * cannot collide with another ruleset's `unit` subtype.
 */
export function registerUnitDataModel(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Actor?: { dataModels?: Record<string, unknown> } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${UNIT_ACTOR_TYPE}`] = createUnitDataClass();
}

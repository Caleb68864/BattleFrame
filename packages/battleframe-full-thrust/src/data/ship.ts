import { MODULE_ID, SHIP_ACTOR_TYPE, FIRE_ARCS, WEAPON_KINDS, MAX_SCREEN_LEVEL, COURSES } from "../constants";

/**
 * The Full Thrust ship (SSD) Actor data model. Only the systems the rules
 * evidence are modelled -- the ship's mass, drives (thrust), the hull damage
 * track, armour, fire control, screens, point defence, its current cinematic
 * movement state (velocity + course), and a list of weapon mounts. Follows the
 * defensive-resolution pattern of the other rulesets so the class is
 * constructible in tests without a live Foundry.
 *
 * Sources: FT2 "Ship Record Sheet (SSD)", "Hull Boxes & Damage", "Fire Arcs".
 */

export type TypeDataModelBaseConstructor = new (...args: any[]) => {
  [key: string]: unknown;
};

export class MissingTypeDataModelBaseError extends Error {
  constructor() {
    super(`${MODULE_ID} | no TypeDataModel base class found on foundry.abstract.TypeDataModel`);
    this.name = "MissingTypeDataModelBaseError";
  }
}

function resolveTypeDataModelBase(): TypeDataModelBaseConstructor {
  const base = (globalThis as unknown as {
    foundry?: { abstract?: { TypeDataModel?: TypeDataModelBaseConstructor } };
  }).foundry?.abstract?.TypeDataModel;

  if (!base) {
    throw new MissingTypeDataModelBaseError();
  }
  return base;
}

function resolveFieldsNamespace(): Record<string, any> {
  return (globalThis as unknown as {
    foundry?: { data?: { fields?: Record<string, any> } };
  }).foundry?.data?.fields ?? {};
}

function nonNegativeInt(initial: number): Record<string, unknown> {
  return { required: true, nullable: false, integer: true, min: 0, initial };
}

export function createShipDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class ShipData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const f = resolveFieldsNamespace();
      const { NumberField, StringField, BooleanField, SchemaField, ArrayField } = f;

      const schema: Record<string, unknown> = {};
      if (!NumberField) {
        return schema;
      }

      schema.mass = new NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 30 });
      schema.thrust = new NumberField(nonNegativeInt(4));

      // The hull damage track: total boxes, boxes crossed off, and the number of
      // threshold rows the track is divided into.
      schema.hull = new SchemaField({
        boxes: new NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 15 }),
        damage: new NumberField(nonNegativeInt(0)),
        rows: new NumberField({ required: true, nullable: false, integer: true, min: 1, initial: 3 })
      });

      // Armour boxes absorb damage before the hull; no threshold at the armour row.
      schema.armour = new SchemaField({
        boxes: new NumberField(nonNegativeInt(0)),
        damage: new NumberField(nonNegativeInt(0))
      });

      schema.fcs = new NumberField(nonNegativeInt(1));
      schema.screens = new NumberField({
        required: true, nullable: false, integer: true, min: 0, max: MAX_SCREEN_LEVEL, initial: 0
      });
      schema.pds = new NumberField(nonNegativeInt(0));
      schema.damageControl = new NumberField(nonNegativeInt(0));

      // Cinematic movement state: current velocity (mu) and heading (course 1-12).
      schema.velocity = new NumberField(nonNegativeInt(0));
      schema.course = new NumberField({
        required: true, nullable: false, integer: true, min: 1, max: COURSES, initial: 12
      });

      schema.pointsValue = new NumberField(nonNegativeInt(0));

      schema.weapons = new ArrayField(
        new SchemaField({
          kind: new StringField({ required: true, blank: false, choices: [...WEAPON_KINDS], initial: "beam" }),
          // Beam class / battery number; null for weapons that do not use a class.
          weaponClass: new NumberField({ required: false, nullable: true, integer: true, min: 1, initial: null }),
          arcs: new ArrayField(new StringField({ choices: [...FIRE_ARCS] })),
          destroyed: new BooleanField({ required: true, initial: false }),
          // One-shot weapons (submunitions) flip this once fired.
          spent: new BooleanField({ required: true, initial: false })
        })
      );

      return schema;
    }
  }

  return ShipData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-full-thrust.ship` as an Actor data model at `init`, per
 * Foundry v14's `CONFIG.Actor.dataModels` path. Namespaced by module id.
 */
export function registerShipDataModel(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Actor?: { dataModels?: Record<string, unknown> } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${SHIP_ACTOR_TYPE}`] = createShipDataClass();
}

import {
  resolveFieldsNamespace,
  resolveTypeDataModelBase,
  type TypeDataModelBaseConstructor,
} from "./foundry-base";

/**
 * `dirtside-ii.vehicle` — a vehicle element (has a token). Every field is
 * USER-entered; the module invents nothing and ships neutral defaults. Boolean /
 * threshold battlefield conditions (damaged / knocked-out) ALSO surface as native
 * status effects (G8); the schema keeps the raw markers. See build plan §3.
 */
export function createVehicleDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class VehicleData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const { NumberField, StringField, BooleanField, ArrayField, SchemaField, ObjectField } = fields;
      const schema: Record<string, unknown> = {};
      if (!NumberField) {
        return schema;
      }

      const intField = (min: number, initial: number, max?: number): unknown =>
        new NumberField({ required: true, nullable: false, integer: true, min, max, initial });

      schema.sizeClass = intField(1, 1, 7);
      schema.signatureBasic = intField(0, 0);
      schema.stealthLevels = intField(0, 0);

      schema.armour = new SchemaField({
        front: new NumberField({ integer: true, min: 0, max: 7, initial: 0 }),
        coating: new StringField({ choices: ["none", "ablative", "reactive"], initial: "none" }),
        openTop: new BooleanField({ initial: false }),
      });

      schema.fireControl = new StringField({
        choices: ["basic", "enhanced", "superior"],
        initial: "basic",
      });
      schema.ecm = new StringField({
        choices: ["none", "basic", "enhanced", "superior"],
        initial: "none",
      });
      schema.powerPlant = new StringField({ choices: ["cfe", "hmt", "fgp"], initial: "cfe" });
      schema.mobility = new StringField({ initial: "" });

      schema.weapons = new ArrayField(weaponSchema(fields), { initial: [] });

      schema.ads = new SchemaField({
        level: new StringField({ initial: "" }),
        active: new BooleanField({ initial: false }),
      });
      schema.pds = new SchemaField({ level: new StringField({ initial: "" }) });
      schema.transport = new SchemaField({
        capacityStands: new NumberField({ integer: true, min: 0, initial: 0 }),
        carrying: new ArrayField(new StringField(), { initial: [] }),
      });

      schema.posture = new StringField({
        choices: ["none", "turret-down", "hull-down", "evading", "soft-cover", "popped-up"],
        initial: "none",
      });

      schema.damage = new StringField({ choices: ["ok", "damaged", "knocked-out"], initial: "ok" });
      schema.mobilityHit = new BooleanField({ initial: false });
      schema.systemsDown = new BooleanField({ initial: false });
      schema.isCommandVehicle = new BooleanField({ initial: false });

      // Optional ObjectField-backed extension slot (kept only if the field exists).
      if (ObjectField) {
        schema.extra = new ObjectField({ initial: {} });
      }

      return schema;
    }
  }
  return VehicleData as unknown as TypeDataModelBaseConstructor;
}

/** One mounted weapon system. Distances + validity are USER tables (no GZG data). */
function weaponSchema(fields: Record<string, any>): unknown {
  const { NumberField, StringField, SchemaField, ObjectField } = fields;
  return new SchemaField({
    type: new StringField({ initial: "" }),
    class: new NumberField({ integer: true, min: 1, max: 6, initial: 1 }),
    mount: new StringField({ choices: ["turret", "fixed"], initial: "turret" }),
    arc: new StringField({
      choices: ["turret360", "turret180", "fixed30", "walker180", "artillery180"],
      initial: "turret360",
    }),
    turretHeading: new NumberField({ integer: true, initial: 0 }),
    bands: new SchemaField({
      close: new NumberField({ min: 0, initial: 0 }),
      medium: new NumberField({ min: 0, initial: 0 }),
      long: new NumberField({ min: 0, initial: 0 }),
      flatMax: new NumberField({ min: 0, initial: 0 }),
    }),
    guidance: new StringField({ initial: "" }),
    chitValidity: ObjectField ? new ObjectField({ initial: {} }) : new StringField({ initial: "" }),
  });
}

import {
  resolveFieldsNamespace,
  resolveTypeDataModelBase,
  type TypeDataModelBaseConstructor,
} from "./foundry-base";

/**
 * `dirtside-ii.unit` — a token-less grouping actor. The activation loop iterates
 * these (build plan §3/A10); elements join up via the `unitId` flag. `activated`
 * is the command marker (true = spent); `underFire` clears at Turn End. All
 * values USER-entered.
 */
export function createUnitDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class UnitData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const { NumberField, StringField, BooleanField, ObjectField } = fields;
      const schema: Record<string, unknown> = {};
      if (!NumberField) {
        return schema;
      }

      schema.role = new StringField({ choices: ["combat", "battery"], initial: "combat" });
      schema.quality = new StringField({
        choices: ["green", "regular", "veteran"],
        initial: "regular",
      });
      schema.leadership = new NumberField({ required: true, integer: true, min: 1, initial: 1 });
      schema.confidence = new StringField({
        choices: ["confident", "steady", "shaken", "broken"],
        initial: "confident",
      });
      schema.isCommandUnit = new BooleanField({ initial: false });
      schema.commandVehicleId = new StringField({ initial: "" });
      schema.activated = new BooleanField({ initial: false });
      schema.underFire = new BooleanField({ initial: false });

      // Battery-only.
      schema.tubes = new NumberField({ integer: true, min: 0, initial: 0 });
      schema.sheaf = new StringField({ choices: ["converged", "open"], initial: "converged" });
      if (ObjectField) {
        schema.ammo = new ObjectField({ initial: {} });
      }

      return schema;
    }
  }
  return UnitData as unknown as TypeDataModelBaseConstructor;
}

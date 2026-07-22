import {
  resolveFieldsNamespace,
  resolveTypeDataModelBase,
  type TypeDataModelBaseConstructor,
} from "./foundry-base";

/**
 * `dirtside-ii.infantry` — an infantry element (a stand; whole-or-gone, no
 * wounds). All values USER-entered. Its owning unit is the `unitId` flag, not a
 * schema field. See build plan §3.
 */
export function createInfantryDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class InfantryData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const { NumberField, StringField, BooleanField, ArrayField } = fields;
      const schema: Record<string, unknown> = {};
      if (!NumberField) {
        return schema;
      }

      schema.troopType = new StringField({
        choices: ["militia", "line", "powered"],
        initial: "line",
      });
      schema.chitsDrawn = new NumberField({ required: true, integer: true, min: 1, initial: 2 });
      schema.killTotal = new NumberField({ required: true, integer: true, min: 1, initial: 3 });
      schema.weapons = new ArrayField(new StringField(), { initial: [] });
      schema.posture = new StringField({
        choices: ["open", "soft", "dug-in", "urban"],
        initial: "open",
      });
      schema.canFirefight = new BooleanField({ initial: true });
      schema.mountedIn = new StringField({ initial: "" });
      schema.removed = new BooleanField({ initial: false });

      return schema;
    }
  }
  return InfantryData as unknown as TypeDataModelBaseConstructor;
}

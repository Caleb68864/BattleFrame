import { FIGHTER_GROUP_ACTOR_TYPE, FIGHTER_GROUP_MAX } from "../constants";
import {
  type TypeDataModelBaseConstructor,
  resolveTypeDataModelBase,
  resolveFieldsNamespace,
  registerActorDataModel
} from "./foundry-data-model";

/**
 * The Full Thrust fighter-group Actor data model. A group is 1-6 fighters that
 * move and fire as one; it carries its current size (the number of dice it
 * throws and the thing casualties remove), its specialised type, remaining
 * endurance, and whether its morale has broken. Only what the rules evidence.
 *
 * Sources: FT2 "Fighter Groups", "Fighter Attacks"; More Thrust endurance/morale;
 * "Specialised Fighter Types".
 */

const FIGHTER_TYPES = [
  "standard",
  "fast",
  "heavy",
  "interceptor",
  "attack",
  "torpedo",
  "long-range"
] as const;

export function createFighterGroupDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class FighterGroupData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const { NumberField, StringField, BooleanField } = resolveFieldsNamespace();
      const schema: Record<string, unknown> = {};
      if (!NumberField) {
        return schema;
      }

      schema.size = new NumberField({
        required: true, nullable: false, integer: true, min: 0, max: FIGHTER_GROUP_MAX, initial: FIGHTER_GROUP_MAX
      });
      schema.fighterType = new StringField({
        required: true, blank: false, choices: [...FIGHTER_TYPES], initial: "standard"
      });
      // Active-turn endurance remaining (More Thrust: 3 for standard, 5 long-range).
      schema.endurance = new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 3 });
      schema.moraleBroken = new BooleanField({ required: true, initial: false });

      return schema;
    }
  }

  return FighterGroupData as unknown as TypeDataModelBaseConstructor;
}

/** Registers `battleframe-full-thrust.fighter-group` as an Actor data model. */
export function registerFighterGroupDataModel(): void {
  registerActorDataModel(FIGHTER_GROUP_ACTOR_TYPE, createFighterGroupDataClass);
}

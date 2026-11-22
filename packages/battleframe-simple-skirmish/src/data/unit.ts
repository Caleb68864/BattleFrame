import { MODULE_ID, UNIT_ACTOR_TYPE, MOVE_STANDARD_INCHES } from "../constants";
import { syncDefeatedStatus, type UnitActorLike } from "./unit-state";

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

/**
 * The Basic Game unit stats (Simple Fantasy Skirmish, Peter Vodden, CC BY-NC
 * 4.0). A d6 stat is a **target number**, and its absence means "cannot do that
 * action" -- modelled as a nullable field defaulting to null, never 0 (a 0
 * would read as "hits on any roll", the opposite of "cannot").
 *
 * - `models`  -- how many models remain; the number of dice thrown, and the
 *   thing removed by casualties. A unit at 0 is destroyed.
 * - `startingModels` -- how many models the unit mustered with: the `max` of
 *   the token resource bar (`modelsBar`). Kept at or above `models` on create
 *   and update, so the bar is never fuller than full.
 * - `move`    -- move speed in inches (3 shambling / 6 standard / 9 fast).
 * - `attackMelee/Ranged/Magic` -- roll >= this on a d6 to hit; null = cannot.
 * - `save`    -- the defender rolls a d6 per hit; **< save = one casualty**;
 *   null = no save, every hit is a casualty.
 * - `skill`   -- Advanced Game; roll >= this to succeed. Carried but unused in
 *   the Basic Game.
 */
function nullableD6Target(): Record<string, unknown> {
  return { required: false, nullable: true, integer: true, min: 1, max: 6, initial: null };
}

export function createUnitDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class UnitData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const NumberField = fields.NumberField;

      const schema: Record<string, unknown> = {};

      if (NumberField) {
        schema.models = new NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 0,
          initial: 1
        });
        schema.startingModels = new NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 0,
          initial: 1
        });
        schema.move = new NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 0,
          initial: MOVE_STANDARD_INCHES
        });
        schema.attackMelee = new NumberField(nullableD6Target());
        schema.attackRanged = new NumberField(nullableD6Target());
        schema.attackMagic = new NumberField(nullableD6Target());
        schema.save = new NumberField(nullableD6Target());
        schema.skill = new NumberField(nullableD6Target());
      }

      return schema;
    }

    /**
     * The model count as the `{ value, max }` pair Foundry draws as a token
     * resource bar (roadmap P1). Derived, so `models` stays the one live count.
     * `max` is floored at `value` for a unit the ready migration has not reached.
     */
    prepareDerivedData(): void {
      super.prepareDerivedData?.();
      const self = this as unknown as { models?: number; startingModels?: number; modelsBar?: unknown };
      const value = self.models ?? 0;
      self.modelsBar = { value, max: Math.max(self.startingModels ?? 0, value) };
    }

    /**
     * The defeated status follows the model count both ways: casualties set it
     * (`applyCasualties`), and restoring models on the sheet clears it. Only the
     * client that made the change writes, so other clients do not repeat it.
     */
    async _onUpdate(changed: Record<string, any>, options: unknown, userId: string): Promise<void> {
      await super._onUpdate?.(changed, options, userId);
      const me = (globalThis as unknown as { game?: { user?: { id?: string } } }).game?.user?.id;
      if (userId !== me) return;
      const models = changed.system?.models ?? changed["system.models"];
      if (typeof models !== "number") return;
      const parent = (this as unknown as { parent?: UnitActorLike }).parent;
      if (parent) await syncDefeatedStatus(parent);
    }

    /** A unit created with more models than its starting count starts with them all. */
    async _preCreate(data: unknown, options: unknown, user: unknown): Promise<boolean | void> {
      const allowed = await super._preCreate?.(data, options, user);
      if (allowed === false) return false;
      const self = this as unknown as {
        models?: number;
        startingModels?: number;
        parent?: { updateSource?: (changes: Record<string, unknown>) => unknown };
      };
      const models = self.models ?? 0;
      if ((self.startingModels ?? 0) < models) {
        self.parent?.updateSource?.({ "system.startingModels": models });
      }
    }

    /**
     * Setting the count above the starting count (the usual way a fresh unit is
     * filled in, on the sheet) raises the starting count with it. Casualties
     * lower `models` only, and leave the max alone.
     */
    async _preUpdate(changes: Record<string, any>, options: unknown, user: unknown): Promise<boolean | void> {
      const allowed = await super._preUpdate?.(changes, options, user);
      if (allowed === false) return false;
      const self = this as unknown as { startingModels?: number };
      // Foundry normally hands this an expanded diff; a flattened key is handled too.
      const flat = "system.models" in changes;
      const models = flat ? changes["system.models"] : changes.system?.models;
      if (typeof models !== "number") return;
      const starting = changes.system?.startingModels ?? changes["system.startingModels"] ?? self.startingModels ?? 0;
      if (starting >= models) return;
      if (flat) changes["system.startingModels"] = models;
      else changes.system.startingModels = models;
    }
  }

  return UnitData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-simple-skirmish.unit` as an Actor data model at
 * `init`, per Foundry v14's `CONFIG.Actor.dataModels` path. Namespaced by
 * module id so it cannot collide with another ruleset's `unit` subtype.
 */
export function registerUnitDataModel(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: {
      Actor?: {
        dataModels?: Record<string, unknown>;
        trackableAttributes?: Record<string, { bar: string[]; value: string[] }>;
      };
    };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  // Foundry only offers an attribute for a token bar if it is declared trackable.
  // `modelsBar` is derived, so it cannot be discovered from the schema.
  globalScope.CONFIG.Actor.trackableAttributes = globalScope.CONFIG.Actor.trackableAttributes ?? {};
  globalScope.CONFIG.Actor.trackableAttributes[`${MODULE_ID}.${UNIT_ACTOR_TYPE}`] = { bar: ["modelsBar"], value: [] };
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${UNIT_ACTOR_TYPE}`] =
    createUnitDataClass();
}

export interface MigratableUnit {
  type?: string;
  system?: { models?: number; startingModels?: number };
  update: (changes: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Gives units saved before `startingModels` existed a starting count. Such a
 * unit loads with the schema's initial value, so any unit whose starting count
 * is below its live count is raised to the live count. That is the best the
 * saved data can say: a unit that had already taken casualties gets its
 * current count as its max. Idempotent, so it is safe to run at every ready.
 * `migrateData` is not used because Foundry also runs it on partial update
 * diffs, where copying `models` would reset the max on every casualty.
 *
 * Returns how many units it updated.
 */
export async function migrateStartingModels(actors: Iterable<MigratableUnit>): Promise<number> {
  let migrated = 0;
  for (const actor of actors) {
    if (actor.type !== `${MODULE_ID}.${UNIT_ACTOR_TYPE}`) continue;
    const models = actor.system?.models ?? 0;
    if ((actor.system?.startingModels ?? 0) >= models) continue;
    await actor.update({ "system.startingModels": models });
    migrated += 1;
  }
  return migrated;
}

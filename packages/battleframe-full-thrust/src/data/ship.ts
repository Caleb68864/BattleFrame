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

import { SHIP_ACTOR_TYPE, FIRE_ARCS, WEAPON_KINDS, MAX_SCREEN_LEVEL, MAX_THRUST, COURSES } from "../constants";
import { shipPointsFromSystem } from "../ship/design";
import {
  type TypeDataModelBaseConstructor,
  resolveTypeDataModelBase,
  resolveFieldsNamespace,
  registerActorDataModel
} from "./foundry-data-model";

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
      schema.thrust = new NumberField({
        required: true, nullable: false, integer: true, min: 0, max: MAX_THRUST, initial: 4
      });
      // Whether the ship carries an FTL drive (affects its Points value).
      schema.ftl = new BooleanField({ required: true, initial: true });
      // Drive damage: 0 = full thrust, 1 = half (first hit), 2 = dead (second).
      schema.driveHits = new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 2, initial: 0 });

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

      // Each of these is a DESIGN count; the matching `…Lost` counter tracks how
      // many were knocked out (remaining = design − lost). Repairable.
      schema.fcs = new NumberField(nonNegativeInt(1));
      schema.fcsLost = new NumberField(nonNegativeInt(0));
      schema.screens = new NumberField({
        required: true, nullable: false, integer: true, min: 0, max: MAX_SCREEN_LEVEL, initial: 0
      });
      schema.screensLost = new NumberField(nonNegativeInt(0));
      schema.pds = new NumberField(nonNegativeInt(0));
      schema.pdsLost = new NumberField(nonNegativeInt(0));
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

    /**
     * Derived read-only values for display. `hullTrack` is the "remaining/total"
     * hull string the hover panel shows (the panel renders a value verbatim, and
     * a static `max` can't track the box count, so we compute the label here).
     */
    prepareDerivedData(): void {
      const self = this as unknown as Record<string, any>;
      const boxes = self.hull?.boxes ?? 0;
      const damage = self.hull?.damage ?? 0;
      self.hullTrack = `${Math.max(0, boxes - damage)}/${boxes}`;

      // "remaining/design" SSD readouts for the sheet + hover, and usable thrust.
      const remaining = (design: number, lost: number): number => Math.max(0, design - lost);
      const hits = self.driveHits ?? 0;
      self.thrustNow = hits >= 2 ? 0 : hits === 1 ? Math.floor((self.thrust ?? 0) / 2) : self.thrust ?? 0;
      self.thrustTrack = `${self.thrustNow}/${self.thrust ?? 0}`;
      self.fcsTrack = `${remaining(self.fcs ?? 0, self.fcsLost ?? 0)}/${self.fcs ?? 0}`;
      self.pdsTrack = `${remaining(self.pds ?? 0, self.pdsLost ?? 0)}/${self.pds ?? 0}`;
      self.screensTrack = `${remaining(self.screens ?? 0, self.screensLost ?? 0)}/${self.screens ?? 0}`;

      // Points value derived from the ship's systems (FT2 Mass/Points estimate).
      self.pointsValue = shipPointsFromSystem(self);
    }
  }

  return ShipData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-full-thrust.ship` as an Actor data model at `init`, per
 * Foundry v14's `CONFIG.Actor.dataModels` path. Namespaced by module id.
 */
export function registerShipDataModel(): void {
  registerActorDataModel(SHIP_ACTOR_TYPE, createShipDataClass);
}

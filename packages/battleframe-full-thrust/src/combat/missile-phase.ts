/**
 * Independent-missile phase core (roadmap P2 #15): the pure state transitions for
 * a launched More-Thrust missile as it flies its own AI course across the board.
 *
 * A missile is NOT a manually-moved token — it is a fire-and-forget craft, so it
 * is stored as lightweight scene state ({position, course, life}) and drawn as a
 * marker; the engine's measure/facing services (which duck-type on `{center}` +
 * `{document.rotation}`) resolve a strike against a real ship token without the
 * missile needing an Actor of its own. This module owns the movement + lifespan
 * math; the Foundry glue (scene-flag storage, marker drawing, strike resolution
 * via `combat/missile.ts`) lives in the round-control orchestrator.
 *
 * Source: More Thrust "Missiles (Basic)" — 18mu/turn with one mid-point 2-point
 * turn, a 3-turn life, then it burns out.
 */

import { plotMissilePath } from "../movement/missile-path";

import type { MissileWarhead } from "./missile";
import { requireRules } from "../rules-profile";

/** One live missile on the board (position in canvas pixels). */
export interface ActiveMissile {
  id: string;
  /** Canvas-pixel position (missile centre). */
  x: number;
  y: number;
  /** Current heading as a clockface course (1-12). */
  course: number;
  /** How many missile phases it has flown (removed at requireRules().missileLifeTurns). */
  turnsLived: number;
  warhead: MissileWarhead;
  /** Needle warhead only: the system type the owner nominated to snipe. */
  systemType?: string;
  /** The launching side's token disposition — a missile only strikes other sides. */
  ownerDisposition: number;
}

/**
 * Advances a missile one phase: it flies its full move (18mu) along its course
 * with an optional single mid-point course turn (|turn| ≤ 2 points; an illegal
 * turn is flown straight), and its life ticks up. Position is updated in pixels
 * using the scene's `pixelsPerMu`. Pure — returns a new missile, never mutates.
 */
export function advanceMissile(missile: ActiveMissile, turn: number, pixelsPerMu: number): ActiveMissile {
  let path = plotMissilePath({ course: missile.course }, requireRules().missileMoveMu, turn);
  if (!path.legal) {
    // A turn sharper than the missile can make: fly straight this phase.
    path = plotMissilePath({ course: missile.course }, requireRules().missileMoveMu, 0);
  }
  return {
    ...missile,
    x: missile.x + path.end.dx * pixelsPerMu,
    y: missile.y + path.end.dy * pixelsPerMu,
    course: path.course,
    turnsLived: missile.turnsLived + 1
  };
}

/** Whether a missile has flown its full life span and must be removed. */
export function missileExpired(missile: ActiveMissile): boolean {
  return missile.turnsLived >= requireRules().missileLifeTurns;
}

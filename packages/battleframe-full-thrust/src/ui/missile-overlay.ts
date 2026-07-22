/**
 * Missile markers: draws each active independent missile as a small arrowhead on
 * the canvas, pointing along its course. Missiles are fire-and-forget craft (not
 * player-moved tokens), so a lightweight PIXI marker is the right representation —
 * the same defensive, never-throws glue as the arc + preview overlays.
 *
 * Purely presentational; the missile state lives on the scene flag and the phase
 * orchestrator drives it. Live-verified.
 */

import { COURSES, COURSE_POINT_DEGREES, MODULE_ID, ACTIVE_MISSILES_FLAG } from "../constants";
import type { ActiveMissile } from "../combat/missile-phase";

const HOSTILE_COLOR = 0xff5555;
const FRIENDLY_COLOR = 0x55aaff;
const SIZE = 11;

interface GraphicsLike {
  clear: () => void;
  lineStyle: (w: number, c: number, a?: number) => void;
  beginFill: (c: number, a?: number) => void;
  endFill: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  destroy?: (o?: unknown) => void;
}

type Glob = {
  PIXI?: { Graphics?: new () => GraphicsLike };
  canvas?: {
    controls?: { addChild?: (c: unknown) => unknown };
    tokens?: { addChild?: (c: unknown) => unknown };
    scene?: { getFlag?: (m: string, k: string) => unknown };
  };
  Hooks?: { on: (event: string, cb: (...args: any[]) => void) => void };
};

function glob(): Glob {
  return globalThis as unknown as Glob;
}

let layerGfx: GraphicsLike | undefined;

function ensure(): GraphicsLike | undefined {
  if (layerGfx) {
    return layerGfx;
  }
  const G = glob().PIXI?.Graphics;
  const layer = glob().canvas?.controls ?? glob().canvas?.tokens;
  if (!G || !layer?.addChild) {
    return undefined;
  }
  try {
    layerGfx = new G();
    layer.addChild(layerGfx);
    return layerGfx;
  } catch {
    layerGfx = undefined;
    return undefined;
  }
}

/** Course (1-12) → heading degrees, clockwise from up — matches the missile path. */
function headingDeg(course: number): number {
  return (course % COURSES) * COURSE_POINT_DEGREES;
}

/** Redraws all missile markers. Silent no-op off-canvas; never throws. */
export function drawMissiles(missiles: readonly ActiveMissile[]): void {
  const g = ensure();
  if (!g) {
    return;
  }
  try {
    g.clear();
    for (const m of missiles) {
      const color = m.ownerDisposition < 0 ? HOSTILE_COLOR : FRIENDLY_COLOR;
      const rad = (headingDeg(m.course) * Math.PI) / 180;
      // Forward unit vector (screen space, y down): up = -y.
      const fx = Math.sin(rad);
      const fy = -Math.cos(rad);
      // A little arrowhead: tip forward, two barbs back-left/right.
      const tip = { x: m.x + fx * SIZE, y: m.y + fy * SIZE };
      const backLeft = { x: m.x - fx * SIZE * 0.5 + fy * SIZE * 0.6, y: m.y - fy * SIZE * 0.5 - fx * SIZE * 0.6 };
      const backRight = { x: m.x - fx * SIZE * 0.5 - fy * SIZE * 0.6, y: m.y - fy * SIZE * 0.5 + fx * SIZE * 0.6 };
      g.lineStyle(2, 0x000000, 0.9);
      g.beginFill(color, 0.95);
      g.moveTo(tip.x, tip.y);
      g.lineTo(backLeft.x, backLeft.y);
      g.lineTo(backRight.x, backRight.y);
      g.lineTo(tip.x, tip.y);
      g.endFill();
    }
  } catch {
    /* a drawing failure must never break the canvas */
  }
}

/** Clears all missile markers (e.g. when none remain). */
export function clearMissiles(): void {
  if (layerGfx) {
    try {
      layerGfx.clear();
    } catch {
      /* ignore */
    }
  }
}

/** Reads the active scene's missile list and draws the markers. */
function redrawFromScene(): void {
  // The overlay graphic is recreated per canvas, so drop the stale handle first.
  layerGfx = undefined;
  const raw = glob().canvas?.scene?.getFlag?.(MODULE_ID, ACTIVE_MISSILES_FLAG);
  drawMissiles(Array.isArray(raw) ? (raw as ActiveMissile[]) : []);
}

/** Redraws persisted missiles whenever a scene finishes drawing. Called at init. */
export function registerMissileOverlay(): void {
  const hooks = glob().Hooks;
  if (!hooks?.on) {
    return;
  }
  hooks.on("canvasReady", () => redrawFromScene());
}

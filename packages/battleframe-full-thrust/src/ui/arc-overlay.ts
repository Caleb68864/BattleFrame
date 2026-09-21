/**
 * Fire-arc token overlay: draws the six 60° fire arcs (and beam range rings) as a
 * ring around a ship token, oriented to its facing — the FT "firing arc" diagram,
 * on the canvas. Lets a player SEE which way each ship's arcs point (and roughly
 * how far its beams reach) at a glance. Shown while a ship is hovered, and
 * pinnable on/off per ship via the "Fire Arcs" scene tool.
 *
 * The geometry (which absolute angles the arc boundaries + labels sit at) is pure
 * and unit-tested so the DRAWN ring matches the actual `combat/arcs.ts`
 * bucketing; the PIXI drawing below is defensive glue (never throws — a drawing
 * failure must not break the canvas) and is live-verified.
 *
 * Facing convention (shared with the engine `facing` primitive): degrees,
 * clockwise, 0 = up / dead-ahead. `arcForBearing` puts the F arc at ±30°, then
 * FS/AS/A/AP/FP clockwise, so the boundaries fall at 30/90/150/210/270/330.
 */

import { FIRE_ARCS, SHIP_ACTOR_TYPE, type FireArc } from "../constants";
import { requireRules } from "../rules-profile";

// --- Pure geometry (unit-tested) --------------------------------------------

export interface ScreenPoint {
  x: number;
  y: number;
}

function normalise(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * The six absolute angles (deg, clockwise-from-up) of the arc boundaries for a
 * token facing `facingDeg`: facing + 30/90/150/210/270/330. These are the rays
 * that divide the ring into the six 60° arcs.
 */
export function arcRayAngles(facingDeg: number): number[] {
  const half = requireRules().arcDegrees / 2; // 30
  return [0, 1, 2, 3, 4, 5].map((i) => normalise(facingDeg + half + i * requireRules().arcDegrees));
}

/**
 * Each arc's label placed at its sector midpoint: F dead-ahead (facing + 0),
 * then FS/AS/A/AP/FP every 60° clockwise.
 */
export function arcLabelAngles(facingDeg: number): Array<{ arc: FireArc; angle: number }> {
  return FIRE_ARCS.map((arc, i) => ({ arc, angle: normalise(facingDeg + i * requireRules().arcDegrees) }));
}

/**
 * Projects an angle (deg, clockwise from up) at `radius` from `center` to a
 * screen point (y increases downward): up = -y, starboard(90°) = +x.
 */
export function polarToScreen(center: ScreenPoint, angleDeg: number, radius: number): ScreenPoint {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: center.x + radius * Math.sin(rad), y: center.y - radius * Math.cos(rad) };
}

// --- PIXI glue (defensive, live-verified) -----------------------------------

const RING_COLOR = 0x66ccff;
const RAY_COLOR = 0x99ddff;
const LABEL_COLOR = 0xffffff;
const BAND_COUNT = 3; // beam range rings at 12 / 24 / 36 mu

interface GraphicsLike {
  clear: () => void;
  lineStyle: (w: number, c: number, a?: number) => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  drawCircle: (x: number, y: number, r: number) => void;
  addChild?: (c: unknown) => unknown;
  removeChildren?: () => void;
  destroy?: (opts?: unknown) => void;
  position?: { set: (x: number, y: number) => void };
  x?: number;
  y?: number;
}

type Glob = {
  PIXI?: { Graphics?: new () => GraphicsLike; Text?: new (t: string, s?: unknown) => any };
  canvas?: {
    tokens?: { addChild?: (c: unknown) => unknown };
    controls?: { addChild?: (c: unknown) => unknown };
    scene?: { grid?: { size?: number; distance?: number } };
  };
  game?: { battleframe?: { facing?: { facingOf?: (t: unknown) => number } } };
  Hooks?: { on: (event: string, cb: (...args: any[]) => void) => void };
};

function glob(): Glob {
  return globalThis as unknown as Glob;
}

const overlays = new Map<string, GraphicsLike>();
const pinned = new Set<string>();

/** mu → pixels for the active scene (grid size / grid distance), default 1. */
function pixelsPerMu(): number {
  const grid = glob().canvas?.scene?.grid;
  const size = grid?.size ?? 100;
  const distance = grid?.distance && grid.distance > 0 ? grid.distance : 1;
  return size / distance;
}

/** A ship token (its actor subtype ends with the ship type). */
function isShipToken(token: any): boolean {
  return typeof token?.actor?.type === "string" && token.actor.type.endsWith(SHIP_ACTOR_TYPE);
}

function facingOf(token: any): number {
  const f = glob().game?.battleframe?.facing?.facingOf;
  if (typeof f === "function") {
    return f(token);
  }
  return normalise(token?.document?.rotation ?? token?.rotation ?? 0);
}

function tokenCenter(token: any): ScreenPoint {
  return token?.center ?? { x: token?.document?.x ?? 0, y: token?.document?.y ?? 0 };
}

/** Longest edge of the token, in px — the arc ring starts just outside the hull. */
function tokenRadiusPx(token: any): number {
  const w = token?.w ?? token?.document?.width ?? 1;
  const h = token?.h ?? token?.document?.height ?? 1;
  const px = Math.max(typeof w === "number" && w > 5 ? w : w * (glob().canvas?.scene?.grid?.size ?? 100),
    typeof h === "number" && h > 5 ? h : h * (glob().canvas?.scene?.grid?.size ?? 100));
  return px / 2;
}

/**
 * Draws (or redraws) the fire-arc ring on `token`. Silent no-op off-canvas or on
 * a non-ship token. Never throws.
 */
export function drawArcOverlay(token: any): void {
  try {
    if (!isShipToken(token)) {
      return;
    }
    const G = glob().PIXI?.Graphics;
    const layer = glob().canvas?.controls ?? glob().canvas?.tokens;
    if (!G || !layer?.addChild) {
      return;
    }
    const id = token?.id ?? token?.document?._id;
    if (!id) {
      return;
    }
    let g = overlays.get(id);
    if (!g) {
      g = new G();
      layer.addChild(g);
      overlays.set(id, g);
    }
    g.removeChildren?.();
    g.clear();

    const center = tokenCenter(token);
    const facing = facingOf(token);
    const ppm = pixelsPerMu();
    const hull = tokenRadiusPx(token);
    const outer = hull + BAND_COUNT * requireRules().beamRangeBandMu * ppm;

    // Concentric beam range rings (12 / 24 / 36 mu).
    for (let band = 1; band <= BAND_COUNT; band++) {
      const r = hull + band * requireRules().beamRangeBandMu * ppm;
      g.lineStyle(1, RING_COLOR, 0.35);
      g.drawCircle(center.x, center.y, r);
    }

    // The six arc-boundary rays, from just outside the hull to the outer ring.
    g.lineStyle(2, RAY_COLOR, 0.7);
    for (const angle of arcRayAngles(facing)) {
      const from = polarToScreen(center, angle, hull);
      const to = polarToScreen(center, angle, outer);
      g.moveTo(from.x, from.y);
      g.lineTo(to.x, to.y);
    }

    // Arc labels (F / FS / …) at each sector midpoint, just inside the first ring.
    const Text = glob().PIXI?.Text;
    if (Text) {
      const labelR = hull + requireRules().beamRangeBandMu * ppm * 0.55;
      for (const { arc, angle } of arcLabelAngles(facing)) {
        const p = polarToScreen(center, angle, labelR);
        const t = new Text(arc, { fontFamily: "Signika, sans-serif", fontSize: 14, fill: LABEL_COLOR, stroke: 0x000000, strokeThickness: 3 });
        t.anchor?.set?.(0.5, 0.5);
        t.position?.set?.(p.x, p.y);
        g.addChild?.(t);
      }
    }
  } catch {
    /* a drawing failure must never break the canvas */
  }
}

/** Removes the ring from `token` (unless it is pinned on). */
export function clearArcOverlay(token: any, force = false): void {
  const id = token?.id ?? token?.document?._id;
  if (!id || (!force && pinned.has(id))) {
    return;
  }
  const g = overlays.get(id);
  if (g) {
    try {
      g.destroy?.({ children: true });
    } catch {
      /* ignore */
    }
    overlays.delete(id);
  }
}

/** Toggles a persistent (pinned) ring on a ship token. Returns the new state. */
export function toggleArcPin(token: any): boolean {
  const id = token?.id ?? token?.document?._id;
  if (!id) {
    return false;
  }
  if (pinned.has(id)) {
    pinned.delete(id);
    clearArcOverlay(token, true);
    return false;
  }
  pinned.add(id);
  drawArcOverlay(token);
  return true;
}

/** Whether a token currently has a pinned ring. */
export function isArcPinned(token: any): boolean {
  const id = token?.id ?? token?.document?._id;
  return !!id && pinned.has(id);
}

/** Redraws a pinned token's ring (call when it moves/rotates). */
export function refreshPinnedArc(token: any): void {
  if (isArcPinned(token)) {
    drawArcOverlay(token);
  }
}

/**
 * Registers the canvas hooks that drive the overlay: draw on hover-in, clear on
 * hover-out (unless pinned), redraw a pinned ring when its token moves/rotates,
 * and clean up on delete. Called once at init.
 */
export function registerArcOverlay(): void {
  const hooks = glob().Hooks;
  if (!hooks?.on) {
    return;
  }
  hooks.on("hoverToken", (token: any, hovered: boolean) => {
    if (hovered) {
      drawArcOverlay(token);
    } else {
      clearArcOverlay(token);
    }
  });
  hooks.on("updateToken", (doc: any) => refreshPinnedArc(doc?.object));
  hooks.on("refreshToken", (token: any) => refreshPinnedArc(token));
  hooks.on("deleteToken", (doc: any) => clearArcOverlay(doc?.object, true));
}

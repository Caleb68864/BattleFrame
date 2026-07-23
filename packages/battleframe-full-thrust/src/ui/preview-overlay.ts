/**
 * The plotting preview overlay: a client-LOCAL line-and-arrow drawn on the
 * canvas showing where the selected ship's plotted order will take it, updated
 * live as the player edits the order. It is a transient PIXI graphic, NOT a
 * synced document, so the opponent never sees it -- only the plotting player
 * does, which is exactly the secrecy the plot phase needs.
 *
 * The geometry is computed by the pure ../movement/preview; this module is the
 * thin, defensive PIXI glue (it must never throw -- a drawing failure must not
 * break plotting). It is UNVERIFIED against a live Foundry canvas.
 */

import type { Pt } from "../movement/preview";
import { arrowHeadPx } from "../movement/preview";

const VALID_COLOR = 0x33aa55;
const INVALID_COLOR = 0xcc3333;

/**
 * The plot line/arrow/nodes are sized as a FRACTION OF THE SCENE GRID so they
 * read at the same visual weight as the ship tokens (which are sized in grid
 * units) -- fixed pixel sizes looked tiny next to big ships on a space scene.
 */
function previewSizes(): { line: number; arrow: number; node: number } {
  const canvas = (globalThis as unknown as {
    canvas?: { grid?: { size?: number }; scene?: { grid?: { size?: number } } };
  }).canvas;
  const raw = canvas?.grid?.size ?? canvas?.scene?.grid?.size;
  const unit = typeof raw === "number" && raw > 0 ? raw : 100;
  // A clean LINE reads the path's length; big nodes just blob together on a short
  // move. Keep the line visible + a modest arrowhead, and the pivot dots SMALL,
  // all capped so they never dwarf the path on a large-grid scene.
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    line: clamp(unit * 0.035, 3, 7),
    arrow: clamp(unit * 0.14, 14, 30),
    node: clamp(unit * 0.02, 2.5, 5)
  };
}

interface PixiGraphicsLike {
  clear: () => void;
  lineStyle: (width: number, color: number, alpha?: number) => void;
  beginFill: (color: number, alpha?: number) => void;
  endFill: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  drawCircle: (x: number, y: number, r: number) => void;
  destroy?: () => void;
}

interface CanvasLayerLike {
  addChild: (child: unknown) => unknown;
}

/** The one live overlay graphic, lazily created and reused across redraws. */
let overlay: PixiGraphicsLike | undefined;

function pixiGraphicsCtor(): (new () => PixiGraphicsLike) | undefined {
  return (globalThis as unknown as { PIXI?: { Graphics?: new () => PixiGraphicsLike } }).PIXI?.Graphics;
}

/** A layer to host the overlay: the controls layer, else the token layer. */
function hostLayer(): CanvasLayerLike | undefined {
  const canvas = (globalThis as unknown as {
    canvas?: { controls?: CanvasLayerLike; tokens?: CanvasLayerLike };
  }).canvas;
  return canvas?.controls ?? canvas?.tokens;
}

function ensureOverlay(): PixiGraphicsLike | undefined {
  if (overlay) {
    return overlay;
  }
  const Graphics = pixiGraphicsCtor();
  const layer = hostLayer();
  if (!Graphics || !layer) {
    return undefined;
  }
  try {
    overlay = new Graphics();
    layer.addChild(overlay);
    return overlay;
  } catch {
    overlay = undefined;
    return undefined;
  }
}

/**
 * Draws (or redraws) the preview polyline through `points` with an arrowhead at
 * the last point. `valid` tints it green for a legal order, red for an illegal
 * one. Silent no-op when there is no canvas/PIXI.
 */
export function drawMovementPreview(points: readonly Pt[], valid: boolean): void {
  const g = ensureOverlay();
  if (!g || points.length < 2) {
    return;
  }
  const color = valid ? VALID_COLOR : INVALID_COLOR;
  const size = previewSizes();
  try {
    g.clear();
    g.lineStyle(size.line, color, 0.9);
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }

    const tip = points[points.length - 1];
    const prev = points[points.length - 2];
    const [b1, b2] = arrowHeadPx(prev, tip, size.arrow);
    g.moveTo(b1.x, b1.y);
    g.lineTo(tip.x, tip.y);
    g.lineTo(b2.x, b2.y);

    // A node dot at each pivot point.
    g.beginFill(color, 0.9);
    for (const p of points) {
      g.drawCircle(p.x, p.y, size.node);
    }
    g.endFill();
  } catch {
    /* a drawing failure must never break plotting */
  }
}

/** Clears the preview overlay (on submit/cancel or when leaving the plot phase). */
export function clearMovementPreview(): void {
  if (!overlay) {
    return;
  }
  try {
    overlay.clear();
  } catch {
    /* ignore */
  }
}

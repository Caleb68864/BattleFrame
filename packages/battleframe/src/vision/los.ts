import { battleframeNamespace } from "../api/index";

/**
 * Line-of-sight, delegated to Foundry's wall/vision system.
 *
 * The hard part -- ray-versus-wall geometry, terrain/limited-sight walls, doors
 * -- is Foundry's, computed by `ClockwiseSweepPolygon.testCollision`. This
 * service does NOT reimplement any of it. It adds only the thin, ruleset-neutral
 * layer every wargame needs on top:
 *
 *  - a stable surface (`game.battleframe.los`) insulated from the exact Foundry
 *    collision entry point, resolved by feature detection;
 *  - token-to-token sight that can sample a target's base corners, answering
 *    "can I see ANY part of that model" rather than only its centre point;
 *  - fail-open behaviour (clear) when there is no canvas -- unit tests and
 *    headless runs have no walls, and treating that as "no obstruction" matches
 *    the no-cover default the rulesets already use.
 *
 * The decision helpers (`isLineClear`, `anyPointVisible`, `boundsSamplePoints`)
 * take an injected backend and are pure, so they test without Foundry.
 */

export interface Point {
  x: number;
  y: number;
}

/** Foundry's wall restriction channels. */
export type WallRestrictionType = "sight" | "move" | "sound" | "light";

export type CollisionMode = "any" | "all" | "closest";

/** The minimal slice of Foundry's polygon collision tester we depend on. */
export interface CollisionBackend {
  testCollision(
    origin: Point,
    destination: Point,
    config: { type: WallRestrictionType; mode: CollisionMode }
  ): unknown;
}

/** A token viewed for sight: a centre, and optionally its canvas bounding box. */
export interface SightToken {
  center: Point;
  bounds?: { x: number; y: number; width: number; height: number };
}

/**
 * True when NO wall of `type` blocks the straight segment origin→destination.
 * Foundry's `testCollision` in "any" mode returns `true` when something blocks,
 * so a clear line is the negation.
 */
export function isLineClear(
  backend: CollisionBackend,
  origin: Point,
  destination: Point,
  type: WallRestrictionType = "sight"
): boolean {
  return backend.testCollision(origin, destination, { type, mode: "any" }) !== true;
}

/** True when the line to AT LEAST ONE sample point is clear (partial sight). */
export function anyPointVisible(
  backend: CollisionBackend,
  origin: Point,
  samples: readonly Point[],
  type: WallRestrictionType = "sight"
): boolean {
  return samples.some((point) => isLineClear(backend, origin, point, type));
}

/** The centre (first, the cheapest common hit) then the four corners of a box. */
export function boundsSamplePoints(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Point[] {
  const { x, y, width, height } = bounds;
  return [
    { x: x + width / 2, y: y + height / 2 },
    { x, y },
    { x: x + width, y },
    { x, y: y + height },
    { x: x + width, y: y + height }
  ];
}

export interface LosApi {
  /** Is the straight line clear of blocking walls of `type` (default sight)? */
  isClear(origin: Point, destination: Point, type?: WallRestrictionType): boolean;
  /**
   * Token-to-token sight. `sample: "centre"` (default) tests centre-to-centre;
   * `sample: "corners"` tests the target's base corners and reports clear if any
   * is visible.
   */
  between(
    a: SightToken,
    b: SightToken,
    opts?: { type?: WallRestrictionType; sample?: "centre" | "corners" }
  ): { clear: boolean };
}

/**
 * Resolves Foundry's collision tester for a restriction channel. v12+ exposes a
 * polygon class per channel at `CONFIG.Canvas.polygonBackends[type]` with a
 * static `testCollision`; `ClockwiseSweepPolygon` is the fallback. Returns
 * undefined when there is no canvas (tests, headless) -- callers fail open.
 */
function resolveBackend(type: WallRestrictionType): CollisionBackend | undefined {
  const scope = globalThis as unknown as {
    CONFIG?: { Canvas?: { polygonBackends?: Record<string, CollisionBackend> } };
    foundry?: { canvas?: { geometry?: { ClockwiseSweepPolygon?: CollisionBackend } } };
    ClockwiseSweepPolygon?: CollisionBackend;
  };

  const perChannel = scope.CONFIG?.Canvas?.polygonBackends?.[type];
  if (perChannel && typeof perChannel.testCollision === "function") {
    return perChannel;
  }

  const sweep = scope.foundry?.canvas?.geometry?.ClockwiseSweepPolygon ?? scope.ClockwiseSweepPolygon;
  if (sweep && typeof sweep.testCollision === "function") {
    return sweep;
  }

  return undefined;
}

export function createLosApi(): LosApi {
  return {
    isClear(origin, destination, type = "sight") {
      const backend = resolveBackend(type);
      if (!backend) {
        return true; // no wall system available -> nothing obstructs
      }
      return isLineClear(backend, origin, destination, type);
    },
    between(a, b, opts) {
      const type = opts?.type ?? "sight";
      const backend = resolveBackend(type);
      if (!backend) {
        return { clear: true };
      }
      if (opts?.sample === "corners" && b.bounds) {
        return { clear: anyPointVisible(backend, a.center, boundsSamplePoints(b.bounds), type) };
      }
      return { clear: isLineClear(backend, a.center, b.center, type) };
    }
  };
}

declare global {
  interface BattleframeGameNamespace {
    los?: LosApi;
  }
}

/** Installs onto the shared namespace at module top level, idempotently. */
export function installLosApi(): LosApi {
  const namespace = battleframeNamespace();
  namespace.los = namespace.los ?? createLosApi();
  return namespace.los;
}

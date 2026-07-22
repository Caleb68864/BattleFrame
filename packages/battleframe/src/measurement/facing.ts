import { battleframeNamespace } from "../api/index";
import type { Point2D } from "./types";

/**
 * Facing geometry -- a core primitive, pure spatial fact with no game meaning.
 *
 * This is the geometry half of the split recorded in
 * `docs/plans/2026-07-17-facing-geometry-design.md`: **core owns which way a
 * base points and where another token sits relative to that heading; the
 * ruleset owns what that means** (a fire arc, a rear-attack bonus, a hit-table
 * row). So this module exposes only angles -- degrees, clockwise -- and never a
 * named arc, an arc *count*, or any fore/aft vocabulary. A ruleset buckets the
 * numeric bearing into whatever arcs its rules define. Keeping arc counts out of
 * core is the most neutral shape the design note recommends (its Q3), and it is
 * what keeps the neutrality vocabulary test green.
 *
 * Convention (self-consistent, documented once here): angles are **degrees,
 * clockwise, 0 = north / straight up** (negative y, matching Foundry's screen
 * space where y increases downward and a token's `rotation` 0 points up). A
 * ruleset that treats "up" as some other heading only shifts every bearing by a
 * constant, which its own arc bucketing absorbs.
 */

/** A token as facing geometry sees it: a centre and a resolvable heading. */
export interface FacingToken {
  center: Point2D;
  /** Placeable rotation in degrees (Foundry `Token#rotation`). */
  rotation?: number;
  /** Document rotation in degrees (Foundry `TokenDocument#rotation`). */
  document?: { rotation?: number };
  /** An explicit facing override, degrees, decoupled from the sprite. */
  flags?: { battleframe?: { facing?: number } };
}

/** Normalises any angle in degrees into the half-open range [0, 360). */
export function normaliseDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * The token's facing angle in degrees, normalised to [0, 360). Resolution
 * order: an explicit `flags.battleframe.facing` override, then the document
 * rotation, then the placeable rotation, then 0. (The document is a token's
 * source of truth; a placeable rotation is the rendered form.)
 */
export function facingOf(token: FacingToken): number {
  const explicit = token.flags?.battleframe?.facing;
  const documentRotation = token.document?.rotation;
  const rotation = token.rotation;

  const raw =
    explicit ?? documentRotation ?? rotation ?? 0;

  return normaliseDegrees(raw);
}

/**
 * The absolute bearing from `from` to `to`, degrees clockwise from north/up, in
 * [0, 360). Screen space is y-down, so "up" is -y; `atan2(dx, -dy)` gives 0 for
 * a target directly above and increases clockwise.
 */
export function absoluteBearing(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dx, -dy);
  return normaliseDegrees((radians * 180) / Math.PI);
}

/**
 * The bearing of `target` relative to `observer`'s own facing: degrees
 * clockwise, 0 = dead ahead (along the observer's heading), in [0, 360). This
 * is the neutral query a ruleset buckets into arcs.
 */
export function bearingOf(observer: FacingToken, target: FacingToken): number {
  const absolute = absoluteBearing(observer.center, target.center);
  return normaliseDegrees(absolute - facingOf(observer));
}

export interface FacingApi {
  facingOf(token: FacingToken): number;
  absoluteBearing(from: Point2D, to: Point2D): number;
  bearingOf(observer: FacingToken, target: FacingToken): number;
}

export function createFacingApi(): FacingApi {
  return { facingOf, absoluteBearing, bearingOf };
}

declare global {
  interface BattleframeGameNamespace {
    facing?: FacingApi;
  }
}

/**
 * Installs onto the shared namespace at module top level (before any `init`),
 * idempotently -- the same guard the measure / dice / rounds installers use, so
 * a consumer that captured `game.battleframe.facing` never sees it swapped.
 */
export function installFacingApi(): FacingApi {
  const namespace = battleframeNamespace();
  namespace.facing = namespace.facing ?? createFacingApi();
  return namespace.facing;
}

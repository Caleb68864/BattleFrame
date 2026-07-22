import { battleframeNamespace } from "../api/index";
import { assertGridlessScene, radiusPx } from "../base/base-model";
import { SYSTEM_ID } from "../constants";
import type {
  MeasurableToken,
  MeasurementApi,
  MeasurementMode,
  MeasurementResult,
  PointSpec
} from "./types";

export class SceneMismatchError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | cannot measure between tokens on scenes with different ` +
        `grid settings; the two tokens do not share a measurement space`
    );
    this.name = "SceneMismatchError";
  }
}

/**
 * Both tokens must be measured in the same space, or the result is a
 * plausible-looking wrong number.
 *
 * Scene identity is decided in three tiers, most authoritative first:
 *
 * 1. Same object reference — trivially the same scene.
 * 2. Scene ids, when both are present. This is the authoritative check: two
 *    *different* scenes can share identical grid settings, and the id is the
 *    only thing that tells them apart. Equal ids are the same space even if
 *    the grid objects are separate instances (a ruleset may hand each token
 *    its own reshaped double); differing ids are a mismatch even if the
 *    grids are byte-identical.
 * 3. Grid parameters, when either id is absent. A fallback for plain-object
 *    callers and tests: they are exactly what the pxPerUnit conversion and the
 *    reported units depend on, so a difference there is a genuine mismatch —
 *    but equal grids without ids can only be assumed, not proven, to be the
 *    same scene.
 */
function assertSameMeasurementSpace(
  tokenA: MeasurableToken,
  tokenB: MeasurableToken
): void {
  const a = tokenA.scene;
  const b = tokenB.scene;

  if (a === b) {
    return;
  }

  if (a.id !== undefined && b.id !== undefined) {
    if (a.id !== b.id) {
      throw new SceneMismatchError();
    }

    return;
  }

  if (
    a.grid.size !== b.grid.size ||
    a.grid.distance !== b.grid.distance ||
    a.grid.units !== b.grid.units
  ) {
    throw new SceneMismatchError();
  }
}

/**
 * Base-to-base distance between two tokens on a gridless scene.
 *
 * centre = hypot(bx - ax, by - ay) / pxPerUnit
 * b2b    = max(0, centre - (radiusA + radiusB))
 *
 * The radii are summed before subtracting, rather than subtracted in turn.
 * `centre - rA - rB` parses as `(centre - rA) - rB`, which in IEEE-754 is not
 * bit-identical to `(centre - rB) - rA` — it made `between(a, b)` differ from
 * `between(b, a)` by an ulp on ~24% of inputs. Float addition *is*
 * commutative, and `hypot` is symmetric, so summing first makes the whole
 * expression exactly commutative (see the symmetry property test).
 *
 * No `canvas.grid.measurePath` — gridless base-to-base is plain arithmetic
 * on the base model (see `../base/base-model`). Square and hex measurement
 * are out of scope for this system and backlogged with BattleTech.
 */
export function between(
  tokenA: MeasurableToken,
  tokenB: MeasurableToken,
  mode: MeasurementMode = "base-to-base"
): MeasurementResult {
  assertSameMeasurementSpace(tokenA, tokenB);
  assertGridlessScene(tokenA.scene);

  const scene = tokenA.scene;
  const pxPerUnitValue = pxPerUnit(scene);

  const centreToCentrePx = Math.hypot(
    tokenB.center.x - tokenA.center.x,
    tokenB.center.y - tokenA.center.y
  );
  const centreToCentreUnits = centreToCentrePx / pxPerUnitValue;

  // Centre-to-centre stops here: base sizes are irrelevant, and a centre
  // distance is never negative so it needs no clamp. Base-to-base subtracts
  // both radii (summed before subtracting -- see the note above -- for exact
  // commutativity) and clamps at 0 for overlapping bases.
  let distance = centreToCentreUnits;

  if (mode === "base-to-base") {
    const radiusAUnits = radiusPx(tokenA, scene) / pxPerUnitValue;
    const radiusBUnits = radiusPx(tokenB, scene) / pxPerUnitValue;
    distance = Math.max(0, centreToCentreUnits - (radiusAUnits + radiusBUnits));
  }

  console.debug(
    `${SYSTEM_ID} | measure.between mode=${mode} centreToCentre=${centreToCentreUnits} ` +
      `distance=${distance}`
  );

  return {
    distance,
    units: scene.grid.units ?? "",
    mode
  };
}

/**
 * Pixels per scene distance-unit — the ratio `between` applies internally. Reads
 * a scene's `grid` (or a bare grid), defaulting to 1 for a missing/degenerate
 * grid so a caller crossing px<->units never divides by zero.
 */
export function pxPerUnit(sceneOrGrid: unknown): number {
  const src = sceneOrGrid as { grid?: { size?: number; distance?: number }; size?: number; distance?: number } | undefined;
  const grid = src?.grid ?? src;
  const size = grid?.size;
  const distance = grid?.distance;
  if (!size || !distance || size <= 0 || distance <= 0) {
    return 1;
  }
  return size / distance;
}

/** The active scene, when a caller does not supply one. */
function activeScene(): MeasurableToken["scene"] | undefined {
  return (globalThis as unknown as { canvas?: { scene?: MeasurableToken["scene"] } }).canvas?.scene;
}

/**
 * Adapts a live placeable to a `MeasurableToken`: its pixel centre + the scene it
 * lives on (falling back to the active scene) plus its base model. Returns
 * undefined when the placeable has no centre (nothing to measure from).
 */
export function fromPlaceable(placeable: unknown): MeasurableToken | undefined {
  const p = placeable as
    | { center?: { x: number; y: number }; scene?: MeasurableToken["scene"]; document?: { flags?: unknown; width?: number; height?: number; rotation?: number }; flags?: unknown; width?: number; height?: number }
    | undefined;
  if (!p?.center) {
    return undefined;
  }
  const scene = p.scene ?? activeScene();
  return {
    center: p.center,
    scene: scene as MeasurableToken["scene"],
    flags: (p.flags ?? p.document?.flags) as MeasurableToken["flags"],
    width: p.width ?? p.document?.width,
    height: p.height ?? p.document?.height,
    document: p.document as MeasurableToken["document"]
  };
}

/** Wraps a bare coordinate as a `MeasurableToken` (with an optional heading). */
export function point(spec: PointSpec): MeasurableToken {
  return {
    center: { x: spec.x, y: spec.y },
    scene: (spec.scene ?? activeScene()) as MeasurableToken["scene"],
    document: { rotation: spec.rotation }
  };
}

export function createMeasurementApi(): MeasurementApi {
  return { between, pxPerUnit, fromPlaceable, point };
}

declare global {
  interface BattleframeGameNamespace {
    measure?: MeasurementApi;
  }
}

/**
 * Installs onto the shared namespace rather than onto `game`: at module
 * top level `game` does not exist yet, and the whole point is that the
 * namespace is reachable before anyone's `init`. `battleframeNamespace()`
 * binds to `game` later -- see ../api/index.
 */
export function installMeasurementApi(): MeasurementApi {
  const namespace = battleframeNamespace();
  namespace.measure = namespace.measure ?? createMeasurementApi();

  return namespace.measure;
}

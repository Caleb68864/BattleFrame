import { battleframeNamespace } from "../api/index";
import { radiusPx } from "../base/base-model";
import { SYSTEM_ID } from "../constants";
import type {
  MeasurableToken,
  MeasurementApi,
  MeasurementResult
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
  tokenB: MeasurableToken
): MeasurementResult {
  assertSameMeasurementSpace(tokenA, tokenB);

  const scene = tokenA.scene;
  const pxPerUnit = scene.grid.size / scene.grid.distance;

  const centreToCentrePx = Math.hypot(
    tokenB.center.x - tokenA.center.x,
    tokenB.center.y - tokenA.center.y
  );
  const centreToCentreUnits = centreToCentrePx / pxPerUnit;

  const radiusAUnits = radiusPx(tokenA, scene) / pxPerUnit;
  const radiusBUnits = radiusPx(tokenB, scene) / pxPerUnit;

  const distance = Math.max(
    0,
    centreToCentreUnits - (radiusAUnits + radiusBUnits)
  );

  console.debug(
    `${SYSTEM_ID} | measure.between centreToCentre=${centreToCentreUnits} ` +
      `radiusA=${radiusAUnits} radiusB=${radiusBUnits} base-to-base=${distance}`
  );

  return {
    distance,
    units: scene.grid.units ?? "",
    mode: "base-to-base"
  };
}

export function createMeasurementApi(): MeasurementApi {
  return { between };
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

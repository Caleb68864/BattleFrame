import { radiusPx } from "../base/base-model";
import { SYSTEM_ID } from "../constants";
import type {
  MeasurableToken,
  MeasurementApi,
  MeasurementResult
} from "./types";

/**
 * Base-to-base distance between two tokens on a gridless scene.
 *
 * centre = hypot(bx - ax, by - ay) / pxPerUnit
 * b2b    = max(0, centre - radiusA - radiusB)
 *
 * No `canvas.grid.measurePath` — gridless base-to-base is plain arithmetic
 * on the base model (see `../base/base-model`). Square and hex measurement
 * are out of scope for this system and backlogged with BattleTech.
 */
export function between(
  tokenA: MeasurableToken,
  tokenB: MeasurableToken
): MeasurementResult {
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
    centreToCentreUnits - radiusAUnits - radiusBUnits
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

export function installMeasurementApi(): MeasurementApi {
  const measure = createMeasurementApi();

  if (typeof game !== "undefined" && game) {
    game.battleframe = {
      ...(game.battleframe ?? {}),
      measure,
    } as BattleframeGameNamespace;
  }

  return measure;
}

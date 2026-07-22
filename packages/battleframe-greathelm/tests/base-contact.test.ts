import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTACT_TOLERANCE_PX,
  baseContactToleranceUnits,
  isBaseContactDistance,
  isInBaseContact,
  type MeasureApiLike,
} from "../src/combat/clash";
import { findDefenderInBaseContact, type RoundKnight } from "../src/ui/round-control";

/**
 * The live bug this file exists for.
 *
 * Foundry stores a token's x/y as INTEGER pixels. A 32mm base on a 100px/in,
 * 25mm-per-square scene is 125.98425196850394px across -- so two of them can
 * never be placed at exactly one base-diameter apart. Placed touching on a
 * real board, Foundry rounded the centres to x=337 and x=463: a 126px gap, and
 * a base-to-base distance of 0.0001574803149606563", not 0.
 *
 * Against `measure.between(a, b).distance === 0` that produced a round which
 * spent fourteen dice and dealt zero damage and ran zero courage tests --
 * every clash die reported "has no enemy in base contact -- die not spent".
 * Base contact is GREATHELM's only spatial relation
 * (vault/greathelm/base-contact-and-engagement.md), so this is the whole game.
 */

const LIVE_BASE_DIAMETER_PX = 125.98425196850394;
const LIVE_BASE_TO_BASE_INCHES = 0.0001574803149606563;

interface PixelToken {
  x: number;
  scene: { grid: { size: number; distance: number; units: string } };
}

/**
 * A measure API that reproduces core's arithmetic rather than standing in for
 * it: same formula as packages/battleframe/src/measurement/measure.ts --
 * `max(0, hypot(dx, dy) / pxPerUnit - (radiusA + radiusB))`, radii summed
 * before subtracting. This package deliberately never imports core (it reaches
 * it only through `game.battleframe`), so the arithmetic is mirrored here.
 * That is what makes this a reproduction of the live board and not a fixture
 * that merely asserts the number we hoped for.
 */
function pixelMeasure(baseDiameterPx: number): MeasureApiLike {
  return {
    between(tokenA: unknown, tokenB: unknown) {
      const a = tokenA as PixelToken;
      const b = tokenB as PixelToken;
      const pxPerUnit = a.scene.grid.size / a.scene.grid.distance;
      const radiusPx = baseDiameterPx / 2;

      return {
        distance: Math.max(
          0,
          Math.abs(b.x - a.x) / pxPerUnit - (radiusPx + radiusPx) / pxPerUnit
        ),
      };
    },
  };
}

function tokenAt(x: number, gridSize = 100, gridDistance = 1): PixelToken {
  return { x, scene: { grid: { size: gridSize, distance: gridDistance, units: "in" } } };
}

describe("base contact -- the live 126px case", () => {
  it("measures the exact non-zero gap the live board produced", () => {
    // Guards the premise. If this ever comes out as 0, the bug is gone at the
    // source and the assertions below stop meaning anything.
    const distance = pixelMeasure(LIVE_BASE_DIAMETER_PX).between(
      tokenAt(337),
      tokenAt(463)
    ).distance;

    expect(distance).toBe(LIVE_BASE_TO_BASE_INCHES);
    expect(distance).not.toBe(0);
  });

  it("counts two touching 32mm bases as base contact", () => {
    // This is the assertion that fails against `distance === 0`.
    expect(
      isInBaseContact(pixelMeasure(LIVE_BASE_DIAMETER_PX), tokenAt(337), tokenAt(463))
    ).toBe(true);
  });

  it("still refuses contact for knights genuinely an inch apart", () => {
    // 126px (touching) + 100px (one inch on this scene) = 226px between centres.
    expect(
      isInBaseContact(pixelMeasure(LIVE_BASE_DIAMETER_PX), tokenAt(337), tokenAt(563))
    ).toBe(false);
  });

  it("finds a defender for a clash die at the live positions", () => {
    // The end of the chain the live round broke at: a Bash/Light/Heavy die
    // found no defender, so it was never spent.
    const actor = { system: { damage: 0 }, async update() {} };
    const attacker: RoundKnight = {
      id: "blue-1",
      playerId: "friendly",
      actor,
      token: tokenAt(337),
    };
    const defender: RoundKnight = {
      id: "red-2",
      playerId: "hostile",
      actor,
      token: tokenAt(463),
    };

    expect(
      findDefenderInBaseContact(attacker, [attacker, defender], pixelMeasure(LIVE_BASE_DIAMETER_PX))
        ?.id
    ).toBe("red-2");
  });
});

describe("base contact tolerance -- derived from the scene, not hardcoded", () => {
  it("is a fixed pixel budget, so it scales with the board", () => {
    expect(baseContactToleranceUnits(tokenAt(0, 100, 1))).toBe(
      BASE_CONTACT_TOLERANCE_PX / 100
    );
    // Same 2px, twice the inches: a 50px/in scene has coarser pixels.
    expect(baseContactToleranceUnits(tokenAt(0, 50, 1))).toBe(
      BASE_CONTACT_TOLERANCE_PX / 50
    );
  });

  it("honours grid.distance, not just grid.size", () => {
    // 100px per 5 units = 20px/unit.
    expect(baseContactToleranceUnits(tokenAt(0, 100, 5))).toBe(
      BASE_CONTACT_TOLERANCE_PX / 20
    );
  });

  it("falls back to Foundry's default 100px scale for a scene-less token", () => {
    expect(baseContactToleranceUnits(undefined)).toBe(BASE_CONTACT_TOLERANCE_PX / 100);
    expect(baseContactToleranceUnits({})).toBe(BASE_CONTACT_TOLERANCE_PX / 100);
    // A degenerate scene is a fallback, not a division by zero.
    expect(baseContactToleranceUnits(tokenAt(0, 100, 0))).toBe(
      BASE_CONTACT_TOLERANCE_PX / 100
    );
  });

  it("covers the worst case integer rounding can produce", () => {
    // Rounding x and y to integers displaces one centre by at most
    // hypot(0.5, 0.5); two tokens compound. The tolerance must clear that.
    const worstCasePx = 2 * Math.hypot(0.5, 0.5);

    expect(BASE_CONTACT_TOLERANCE_PX).toBeGreaterThan(worstCasePx);
  });

  it("is tight enough that a visible gap is never contact", () => {
    // 2px on a 100px/in scene is 0.02" -- a fiftieth of an inch, far below
    // anything a player can see between two models.
    expect(isBaseContactDistance(0.02, tokenAt(0))).toBe(true);
    expect(isBaseContactDistance(0.03, tokenAt(0))).toBe(false);
    expect(isBaseContactDistance(0.5, tokenAt(0))).toBe(false);
    expect(isBaseContactDistance(1, tokenAt(0))).toBe(false);
  });

  it("still treats an exact zero as contact", () => {
    expect(isBaseContactDistance(0, tokenAt(0))).toBe(true);
  });
});

describe("base contact tolerance -- delegates to the engine's pxPerUnit at runtime", () => {
  const globalScope = globalThis as unknown as { game?: unknown };

  afterEach(() => {
    delete globalScope.game;
  });

  it("routes through game.battleframe.measure.pxPerUnit when the engine is present", () => {
    // The engine copy is the single source of truth (roadmap: delete the module's
    // duplicate). Prove clash.ts calls it rather than re-deriving size/distance:
    // a stub that returns a distinctive ratio must drive the tolerance.
    const pxPerUnit = vi.fn((sceneOrGrid: unknown) => {
      const grid = (sceneOrGrid as { grid?: { size?: number; distance?: number } }).grid;
      return (grid?.size ?? 0) / (grid?.distance ?? 1);
    });
    globalScope.game = { battleframe: { measure: { between: () => ({ distance: 0 }), pxPerUnit } } };

    // 100px / 5 units = 20px/unit, via the engine stub.
    expect(baseContactToleranceUnits(tokenAt(0, 100, 5))).toBe(BASE_CONTACT_TOLERANCE_PX / 20);
    expect(pxPerUnit).toHaveBeenCalledWith(tokenAt(0, 100, 5).scene);
  });

  it("still falls back to the local 100px default for a scene-less token even with the engine present", () => {
    // fromPlaceable/pxPerUnit only apply when there is a scene to read; a
    // scene-less plain-object token keeps the documented DEFAULT_PX_PER_SCENE_UNIT.
    globalScope.game = {
      battleframe: { measure: { between: () => ({ distance: 0 }), pxPerUnit: () => 1 } },
    };

    expect(baseContactToleranceUnits(undefined)).toBe(BASE_CONTACT_TOLERANCE_PX / 100);
    expect(baseContactToleranceUnits({})).toBe(BASE_CONTACT_TOLERANCE_PX / 100);
  });
});

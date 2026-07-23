/**
 * Ships a few ready-to-play starfield battle scenes with the module, created once
 * per world on `ready` (GM-only, idempotent by name). The backgrounds are the
 * module's own procedurally-generated starfield SVGs (assets/scenes/*.svg). Scenes
 * are gridless (Full Thrust is a no-grid space game) sized to the artwork.
 *
 * Mirrors the how-to-play journal's create-once pattern. The scene DATA is pure
 * (unit-tested); the Scene.create + idempotency is thin, defensive glue.
 */

import { MODULE_ID } from "../constants";

/** A starfield scene: its display name and the shipped background asset. */
interface StarfieldScene {
  name: string;
  background: string;
}

// PNG, not SVG: Foundry silently drops an SVG scene background (backgrounds must
// be raster). The PNGs are rendered from the SVG sources in assets/scenes/.
const STARFIELDS: readonly StarfieldScene[] = [
  { name: "Full Thrust — Deep Space", background: "deep-space.png" },
  { name: "Full Thrust — Nebula Field", background: "nebula-field.png" },
  { name: "Full Thrust — Sparse Void", background: "sparse-void.png" }
];

/** Scene dimensions, matched to the generated artwork (assets/scenes/*.svg). */
const SCENE_WIDTH = 4000;
const SCENE_HEIGHT = 3000;

/**
 * The Foundry Scene create-data for each shipped starfield, pure so it is
 * unit-testable. Gridless (`grid.type: 0`), sized to the artwork, background
 * pointing at the module's own asset.
 */
export function starfieldSceneData(): Record<string, unknown>[] {
  return STARFIELDS.map((s) => {
    const stem = s.background.replace(/\.png$/, "");
    return {
      name: s.name,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      padding: 0.05,
      backgroundColor: "#03040c",
      background: { src: `modules/${MODULE_ID}/assets/scenes/${s.background}` },
      // A pre-made thumbnail so Scene.create doesn't auto-generate one (which needs
      // the canvas renderer -- creation stays robust even before the canvas is up).
      thumb: `modules/${MODULE_ID}/assets/scenes/${stem}-thumb.png`,
      // Gridless space: type 0. 1 grid unit = 100px = 1 mu (matches the movement scale).
      grid: { type: 0, size: 100, distance: 1, units: "mu" }
    };
  });
}

interface GlobalScope {
  game?: {
    user?: { isGM?: boolean };
    scenes?: Iterable<{ name?: string }> | { name?: string }[];
  };
  Scene?: { create: (data: Record<string, unknown>) => Promise<unknown> };
  Hooks?: { once?: (event: string, cb: () => void) => void };
}

function g(): GlobalScope {
  return globalThis as unknown as GlobalScope;
}

/** Whether a scene of the given name already exists in the world. */
function sceneExists(name: string): boolean {
  const scenes = g().game?.scenes;
  if (!scenes) {
    return false;
  }
  for (const scene of scenes as Iterable<{ name?: string }>) {
    if (scene?.name === name) {
      return true;
    }
  }
  return false;
}

/**
 * Creates the shipped starfield scenes once, idempotently: only the GM creates
 * them (players cannot make world scenes), and only those not already present.
 * Safe to call on every `ready`.
 */
export async function createStarfieldScenesIfMissing(): Promise<void> {
  if (g().game?.user?.isGM !== true) {
    return;
  }
  // Call Scene.create AS A METHOD (Scene.create(...)) -- it is a static that reads
  // `this` internally, so a detached `const create = Scene.create; create(...)`
  // throws "cannot read 'implementation' of undefined". (Same this-binding lesson
  // as the engine notify service.)
  const scenes = g().Scene;
  if (typeof scenes?.create !== "function") {
    return;
  }
  for (const data of starfieldSceneData()) {
    if (sceneExists(String(data.name))) {
      continue;
    }
    try {
      await scenes.create(data);
    } catch (error) {
      console.warn(`${MODULE_ID} | could not create starfield scene ${String(data.name)}`, error);
    }
  }
}

/** Registers the ready hook that creates the shipped starfield scenes once per world. */
export function registerStarfieldScenes(): void {
  const hooks = g().Hooks;
  if (!hooks?.once) {
    return;
  }
  hooks.once("ready", () => {
    void createStarfieldScenesIfMissing().catch((error) => {
      console.warn(`${MODULE_ID} | could not create starfield scenes`, error);
    });
  });
}

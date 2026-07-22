import { MODULE_ID, UNIT_ACTOR_TYPE } from "./constants";

/**
 * Default token images for Simple Skirmish's actor subtypes. Registering a
 * type->icon with the engine's token-defaults registry (game.battleframe.tokens)
 * means a fresh unit Actor gets its shipped game-icon instead of Foundry's
 * mystery-man -- the engine owns the single preCreateActor hook and the "don't
 * override a deliberately-chosen image" rule; this module owns only WHICH icon
 * per type. Mirrors the hover/status adoption pattern in this same module.
 */

export interface DefaultTokenImage {
  type: string;
  img: string;
}

/** The type->icon defaults this ruleset contributes. */
export function simpleSkirmishDefaultTokenImages(): DefaultTokenImage[] {
  return [{ type: `${MODULE_ID}.${UNIT_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/squad.svg` }];
}

/** The engine's token-defaults registry (game.battleframe.tokens), resolved defensively. */
function tokensApi(): { registerDefaultImage: (type: string, img: string) => void } | undefined {
  const scope = globalThis as {
    battleframe?: { tokens?: { registerDefaultImage: (type: string, img: string) => void } };
    game?: { battleframe?: { tokens?: { registerDefaultImage: (type: string, img: string) => void } } };
  };
  return scope.battleframe?.tokens ?? scope.game?.battleframe?.tokens;
}

/** Registers Simple Skirmish's default token images via the engine registry at init. No-op without it. */
export function registerSimpleSkirmishTokenDefaults(): void {
  const tokens = tokensApi();
  if (!tokens) {
    return;
  }
  for (const { type, img } of simpleSkirmishDefaultTokenImages()) {
    tokens.registerDefaultImage(type, img);
  }
}

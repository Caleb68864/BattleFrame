import { MODULE_ID, UNIT_ACTOR_TYPE } from "./constants";

/**
 * Default token images for InCountry's actor subtypes. Registering a type->icon
 * with the engine's token-defaults registry (game.battleframe.tokens) means a
 * fresh unit Actor gets its shipped game-icon instead of Foundry's mystery-man --
 * the engine owns the single preCreateActor hook and the "don't override a
 * deliberately-chosen image" rule; this module owns only WHICH icon per type.
 *
 * Types are module-id-namespaced (`battleframe-incountry.unit`) and paths point
 * at this module's shipped `icons/` dir, both as Foundry v14 requires. Mirrors
 * the status.ts adoption pattern in this same module.
 */

export interface DefaultTokenImage {
  type: string;
  img: string;
}

/** The type->icon defaults this ruleset contributes. */
export function incountryDefaultTokenImages(): DefaultTokenImage[] {
  return [
    { type: `${MODULE_ID}.${UNIT_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/squad.svg` }
  ];
}

/** The engine's token-defaults registry (game.battleframe.tokens), resolved defensively. */
function tokensApi(): { registerDefaultImage: (type: string, img: string) => void } | undefined {
  const scope = globalThis as {
    battleframe?: { tokens?: { registerDefaultImage: (type: string, img: string) => void } };
    game?: { battleframe?: { tokens?: { registerDefaultImage: (type: string, img: string) => void } } };
  };
  return scope.battleframe?.tokens ?? scope.game?.battleframe?.tokens;
}

/** Registers InCountry's default token images via the engine's token registry at init. No-op without it. */
export function registerInCountryTokenDefaults(): void {
  const tokens = tokensApi();
  if (!tokens) {
    return;
  }
  for (const { type, img } of incountryDefaultTokenImages()) {
    tokens.registerDefaultImage(type, img);
  }
}

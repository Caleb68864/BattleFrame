import { MODULE_ID, VEHICLE_ACTOR_TYPE, INFANTRY_ACTOR_TYPE } from "./constants";

/**
 * Default token images for Dirtside II's actor subtypes. Registering a type->icon
 * with the engine's token-defaults registry (game.battleframe.tokens) means a
 * fresh element Actor gets its shipped game-icon instead of Foundry's
 * mystery-man -- the engine owns the single preCreateActor hook and the "don't
 * override a deliberately-chosen image" rule; this module owns only WHICH icon
 * per type.
 *
 * Only the two TOKEN-bearing element subtypes get a default: `vehicle` and
 * `infantry`. The `unit` subtype is a token-less grouping Actor (it never drops
 * a token), so it is deliberately omitted. Types are module-id-namespaced
 * (`battleframe-dirtside-ii.vehicle`) and paths point at this module's shipped
 * `icons/` dir, both as Foundry v14 requires. Mirrors the status.ts adoption
 * pattern in this same module.
 */

export interface DefaultTokenImage {
  type: string;
  img: string;
}

/** The type->icon defaults this ruleset contributes (token-bearing subtypes only). */
export function dirtsideDefaultTokenImages(): DefaultTokenImage[] {
  return [
    { type: `${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/vehicle.svg` },
    { type: `${MODULE_ID}.${INFANTRY_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/infantry.svg` }
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

/** Registers DSII's default token images via the engine's token registry at init. No-op without it. */
export function registerDirtsideTokenDefaults(): void {
  const tokens = tokensApi();
  if (!tokens) {
    return;
  }
  for (const { type, img } of dirtsideDefaultTokenImages()) {
    tokens.registerDefaultImage(type, img);
  }
}

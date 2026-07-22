/**
 * Default token images for this ruleset's actor subtypes, surfaced through the
 * engine's neutral token-defaults registry (game.battleframe.tokens) so a fresh
 * ship/fighter-group drops onto the canvas with its game-icon instead of
 * Foundry's mystery-man. Mirrors the status/hover adoption pattern: the ruleset
 * owns WHICH image per type; the engine owns the single preCreateActor hook and
 * the "don't override a deliberately-chosen image" rule.
 *
 * Icons are the module's shipped game-icons.net art (CC BY 3.0, see
 * ATTRIBUTIONS.md).
 */

import { MODULE_ID, SHIP_ACTOR_TYPE, FIGHTER_GROUP_ACTOR_TYPE } from "./constants";

interface TokenDefaultsRegistry {
  registerDefaultImage: (type: string, img: string) => void;
}

/** The engine's token-defaults registry (game.battleframe.tokens), resolved defensively. */
function tokensApi(): TokenDefaultsRegistry | undefined {
  const scope = globalThis as {
    battleframe?: { tokens?: TokenDefaultsRegistry };
    game?: { battleframe?: { tokens?: TokenDefaultsRegistry } };
  };
  return scope.game?.battleframe?.tokens ?? scope.battleframe?.tokens;
}

/** Registers the ship + fighter-group default token images via the engine registry. */
export function registerShipTokenDefaults(): void {
  const registry = tokensApi();
  if (!registry) {
    return;
  }
  registry.registerDefaultImage(`${MODULE_ID}.${SHIP_ACTOR_TYPE}`, `modules/${MODULE_ID}/icons/ship.svg`);
  registry.registerDefaultImage(`${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`, `modules/${MODULE_ID}/icons/fighter.svg`);
}

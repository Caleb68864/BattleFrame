import { SYSTEM_ID } from "./constants";
import systemManifest from "../system.json";

/**
 * The running system version, resolved at runtime rather than pinned.
 *
 * This was `const RUNNING_BATTLEFRAME_VERSION = "0.1.0"` in the registry,
 * agreeing with `system.json` only by coincidence and coupled to nothing. It
 * is the version a ruleset's `battleframeCompatibility.minimum` is checked
 * against, so a stale value fails *backwards*: the day `system.json` becomes
 * `0.2.0`, a ruleset correctly requiring `>= 0.2.0` is rejected with "the
 * running system is 0.1.0", and nothing errors -- it just refuses good work.
 *
 * Two sources, and neither can drift:
 * - `game.system.version` is what Foundry parsed from the manifest and loaded.
 *   It is the authority at runtime, and it exists by the time a ruleset's
 *   `init` calls `registerRuleset`.
 * - `MANIFEST_VERSION` is that same `system.json`, imported at build time, for
 *   the contexts where `game` is absent (tests, and any top-level registration
 *   before `init`). It is the file itself, not a copy of a number from it.
 */
export const MANIFEST_VERSION: string = systemManifest.version;

export function runningBattleframeVersion(): string {
  const scope = globalThis as unknown as {
    game?: { system?: { id?: string; version?: string } };
  };
  const system = scope.game?.system;

  if (system?.id === SYSTEM_ID && typeof system.version === "string") {
    return system.version;
  }

  return MANIFEST_VERSION;
}

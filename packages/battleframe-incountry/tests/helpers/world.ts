import { MODULE_ID, SETTING_DIE_SIZE } from "../../src/constants";

/**
 * A world that has answered for its own rules numbers.
 *
 * The module ships no die size, so every roll path refuses until a world sets
 * one -- which means a test that rolls has to supply the number the same way a
 * user does. That is the point rather than an inconvenience: if these helpers
 * defaulted to a die, the published value would live here instead of in
 * `constants.ts` and the strip would be cosmetic.
 *
 * The value below is arbitrary and deliberately **not** the one the rulebook
 * prints. A test asserting mechanics does not need the real die, and using it
 * would put the number back in the repository through the test suite.
 */
export const TEST_DIE_SIZE = 8;

interface SettingsStub {
  register: () => void;
  get: (namespace: string, key: string) => unknown;
}

/**
 * Installs a `game.settings` stub carrying a die size for the duration of a
 * test, and returns the teardown.
 *
 * @param dieSize The die the fake world rolls. Omit for {@link TEST_DIE_SIZE};
 *   pass `0` to model a world that has not chosen one yet.
 */
export function withDieSize(dieSize: number = TEST_DIE_SIZE): () => void {
  const globalScope = globalThis as unknown as {
    game?: { settings?: SettingsStub };
  };
  const previous = globalScope.game;

  globalScope.game = {
    ...(previous ?? {}),
    settings: {
      register: () => {},
      get: (namespace: string, key: string) =>
        namespace === MODULE_ID && key === SETTING_DIE_SIZE ? dieSize : undefined
    }
  };

  return () => {
    globalScope.game = previous;
  };
}

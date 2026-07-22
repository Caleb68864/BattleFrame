/**
 * i18n service — localize / format a translation key with a plain fallback.
 *
 * Every module's UI needs "the localized string for this key, or this English
 * fallback if i18n isn't available yet". Four rulesets independently hand-rolled
 * the identical `i18n?.format?() ?? i18n?.localize?() ?? fallback` shape (the
 * fallback is what lets their unit tests run without a live `game.i18n`). This
 * owns that once. Neutral — the KEYS and STRINGS stay each module's.
 *
 * Source: QoL→engine extraction scan, finding 1.
 */

import { battleframeNamespace } from "../api/index";

interface I18nGlobals {
  game?: {
    i18n?: {
      localize?: (key: string) => string;
      format?: (key: string, data?: Record<string, unknown>) => string;
    };
  };
}

function globals(): I18nGlobals {
  return globalThis as unknown as I18nGlobals;
}

export interface I18nApi {
  /** The localized string for `key`, or `fallback` (or the key itself) if i18n is absent. */
  localize(key: string, fallback?: string): string;
  /** The interpolated localized string for `key`, falling back to localize → fallback → key. */
  format(key: string, data?: Record<string, unknown>, fallback?: string): string;
}

export function createI18nApi(): I18nApi {
  return {
    localize(key, fallback) {
      return globals().game?.i18n?.localize?.(key) ?? fallback ?? key;
    },
    format(key, data, fallback) {
      const i18n = globals().game?.i18n;
      return i18n?.format?.(key, data) ?? i18n?.localize?.(key) ?? fallback ?? key;
    }
  };
}

declare global {
  interface BattleframeGameNamespace {
    i18n?: I18nApi;
  }
}

/** Installs the i18n service onto the shared namespace (before any `init`). */
export function installI18nApi(): I18nApi {
  const namespace = battleframeNamespace();
  namespace.i18n = namespace.i18n ?? createI18nApi();
  return namespace.i18n;
}

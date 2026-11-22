import { MODULE_ID } from "./constants";

/**
 * Foundry's translation of `<module>.<suffix>`, with the English fallback (values
 * already filled in) when no translation is loaded. Foundry hands back the bare
 * key for a string it has no translation for -- including before the language
 * files load, which is when a registration failure fires -- so that also falls
 * back to the English.
 */
export function tr(suffix: string, fallback: string, data?: Record<string, string | number>): string {
  const i18n = (globalThis as unknown as {
    game?: {
      i18n?: {
        localize?: (key: string) => string;
        format?: (key: string, data: Record<string, string | number>) => string;
      };
    };
  }).game?.i18n;
  const key = `${MODULE_ID}.${suffix}`;
  const out = data && i18n?.format ? i18n.format(key, data) : i18n?.localize?.(key);
  return out === undefined || out === key ? fallback : out;
}

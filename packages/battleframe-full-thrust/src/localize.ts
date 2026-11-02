/**
 * Foundry's translation, with the English fallback for when no i18n is present.
 * `format` fills `{placeholders}` from `data`; the fallback already has its values.
 */
export function tr(key: string, fallback: string, data?: Record<string, unknown>): string {
  const i18n = (globalThis as unknown as {
    game?: {
      i18n?: {
        format?: (key: string, data?: Record<string, unknown>) => string;
        localize?: (key: string) => string;
      };
    };
  }).game?.i18n;
  return i18n?.format?.(key, data) ?? i18n?.localize?.(key) ?? fallback;
}

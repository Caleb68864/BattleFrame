/**
 * The hover panel's content is ruleset-owned: each ruleset registers, per
 * namespaced Actor type, which system fields to show. The engine holds only
 * this registry and never names a type or field itself (engine neutrality).
 */
export type VisibilityMode = "everyone" | "owners" | "gm";

export interface HoverStatField {
  /** Path into `actor.system`, e.g. "damage". */
  key: string;
  /** i18n key or literal label. */
  label: string;
  /** When present, the value renders as `value/max`. */
  max?: number;
}

export interface HoverProvider {
  fields: HoverStatField[];
  /** Seeds the "Ruleset default" visibility choice; defaults to "owners". */
  defaultVisibility?: VisibilityMode;
}

export interface HoverRegistry {
  register(actorType: string, provider: HoverProvider): void;
  get(actorType: string): HoverProvider | undefined;
}

export function createHoverRegistry(): HoverRegistry {
  const providers = new Map<string, HoverProvider>();
  return {
    register: (actorType, provider) => void providers.set(actorType, provider),
    get: (actorType) => providers.get(actorType),
  };
}

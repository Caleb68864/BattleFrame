/**
 * token-defaults service — a neutral registry so a ruleset can give its actor
 * SUBTYPES a default token image (a game icon) instead of Foundry's mystery-man.
 * Mirrors the status/hover registries: the ruleset owns WHICH image per type; the
 * engine owns the single `preCreateActor` hook and the "don't override a
 * deliberately-chosen image" rule. Registering the first type lazily installs the
 * hook (Hooks exists by a module's `init`, when registrations happen).
 */

import { battleframeNamespace } from "../api/index";

/** Foundry's built-in default actor/token image. */
const CORE_DEFAULT_ICON = "icons/svg/mystery-man.svg";

/**
 * Whether to apply a registered default: only when the actor has no image, or
 * still carries the core mystery-man default (i.e. the creator didn't pick one).
 */
export function shouldApplyDefault(currentImg: string | undefined): boolean {
  return !currentImg || currentImg === CORE_DEFAULT_ICON;
}

interface HookGlobals {
  Hooks?: { on?: (event: string, cb: (...args: any[]) => void) => void };
}

interface PreCreateActorLike {
  type?: string;
  updateSource?: (data: Record<string, unknown>) => unknown;
}

export interface TokenDefaultsApi {
  /** Register the default token image for one actor type (namespace by module id). */
  registerDefaultImage(type: string, img: string): void;
  /** The default image for a type, or undefined (used by the hook; exposed for tests). */
  defaultImageFor(type: string | undefined): string | undefined;
}

export function createTokenDefaultsApi(): TokenDefaultsApi {
  const registry = new Map<string, string>();
  let installed = false;

  const api: TokenDefaultsApi = {
    registerDefaultImage(type, img) {
      registry.set(type, img);
      install();
    },
    defaultImageFor(type) {
      return type ? registry.get(type) : undefined;
    }
  };

  function install(): void {
    if (installed) {
      return;
    }
    const hooks = (globalThis as unknown as HookGlobals).Hooks;
    if (!hooks?.on) {
      return;
    }
    installed = true;
    hooks.on("preCreateActor", (actor: PreCreateActorLike, data: { type?: string; img?: string } = {}) => {
      const img = api.defaultImageFor(data.type ?? actor?.type);
      if (!img || !shouldApplyDefault(data.img)) {
        return;
      }
      // Set both the Actor image and the prototype token so dropped tokens use it.
      actor.updateSource?.({ img, prototypeToken: { texture: { src: img } } });
    });
  }

  return api;
}

declare global {
  interface BattleframeGameNamespace {
    tokens?: TokenDefaultsApi;
  }
}

/** Installs the token-defaults service onto the shared namespace (before any `init`). */
export function installTokenDefaultsApi(): TokenDefaultsApi {
  const namespace = battleframeNamespace();
  namespace.tokens = namespace.tokens ?? createTokenDefaultsApi();
  return namespace.tokens;
}

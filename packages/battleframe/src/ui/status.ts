import { battleframeNamespace } from "../api/index";

/**
 * Status-effect registration -- the generic plumbing every ruleset needs to make
 * a battlefield condition show as a native token icon (sync + persist), instead
 * of an invisible `system` boolean. The engine owns ONLY the idempotent push
 * onto `CONFIG.statusEffects`; the ruleset owns *which* conditions exist and
 * *when* to toggle them (`actor.toggleStatusEffect`). No condition vocabulary
 * enters core -- it is pure Foundry-config plumbing, extracted because two
 * rulesets hand-rolled the same dedup-and-push loop.
 */

export interface StatusEffectDefinition {
  /** Unique status id (namespace it by module id). */
  id: string;
  /** Display name -- an i18n key the panel/token localizes. */
  name: string;
  /** Icon path (a core Foundry SVG; ship no artwork). */
  img: string;
  /** Any further Foundry status-effect fields pass through unchanged. */
  [key: string]: unknown;
}

export interface StatusApi {
  /** Adds an effect to `CONFIG.statusEffects`, once (deduped by id). No-op without CONFIG. */
  register(effect: StatusEffectDefinition): void;
  /** The ids registered so far (best-effort; reads the live CONFIG). */
  registered(): string[];
}

function config(): { statusEffects?: StatusEffectDefinition[] } | undefined {
  return (globalThis as unknown as { CONFIG?: { statusEffects?: StatusEffectDefinition[] } }).CONFIG;
}

export function createStatusApi(): StatusApi {
  return {
    register(effect: StatusEffectDefinition): void {
      const cfg = config();
      if (!cfg) {
        return;
      }
      if (!Array.isArray(cfg.statusEffects)) {
        cfg.statusEffects = [];
      }
      if (!cfg.statusEffects.some((existing) => existing.id === effect.id)) {
        cfg.statusEffects.push(effect);
      }
    },
    registered(): string[] {
      return (config()?.statusEffects ?? []).map((e) => e.id);
    }
  };
}

declare global {
  interface BattleframeGameNamespace {
    status?: StatusApi;
  }
}

/**
 * Installs the one status api on the battleframe namespace at module top level
 * (before any ruleset's `init`), the same way the hover/dice/measure apis are
 * installed. See ../api/index.
 */
export function installStatusApi(): StatusApi {
  const namespace = battleframeNamespace();
  namespace.status = namespace.status ?? createStatusApi();
  return namespace.status;
}

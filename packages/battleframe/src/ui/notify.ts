/**
 * notify service — a defensive wrapper over `ui.notifications` that never throws
 * and, when notifications aren't available, falls back to the console.
 *
 * Three modules shipped byte-identical copies of this. It also encodes a
 * live-caught lesson: call the reporter AS A METHOD (`notifications[level](msg)`),
 * never a detached reference — Foundry's own info/warn/error read `this`
 * internally, and a bare reference throws the moment it tries to report, masking
 * whatever actually failed. Source: QoL→engine extraction scan, finding 2.
 */

import { battleframeNamespace } from "../api/index";
import { SYSTEM_ID } from "../constants";

type Level = "info" | "warn" | "error";

interface NotifyGlobals {
  ui?: { notifications?: Partial<Record<Level, (message: string) => void>> };
}

function globals(): NotifyGlobals {
  return globalThis as unknown as NotifyGlobals;
}

function report(level: Level, message: string): void {
  const notifications = globals().ui?.notifications;
  // Keep the call on `notifications` so Foundry's reporter keeps its `this`.
  if (typeof notifications?.[level] === "function") {
    notifications[level]?.(message);
    return;
  }
  console.log(`${SYSTEM_ID} | ${message}`);
}

export interface NotifyApi {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function createNotifyApi(): NotifyApi {
  return {
    info: (m) => report("info", m),
    warn: (m) => report("warn", m),
    error: (m) => report("error", m)
  };
}

declare global {
  interface BattleframeGameNamespace {
    notify?: NotifyApi;
  }
}

/** Installs the notify service onto the shared namespace (before any `init`). */
export function installNotifyApi(): NotifyApi {
  const namespace = battleframeNamespace();
  namespace.notify = namespace.notify ?? createNotifyApi();
  return namespace.notify;
}

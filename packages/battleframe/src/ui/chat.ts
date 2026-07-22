/**
 * Chat service — currently just the neutral HTML-entity escaper every module
 * needs when building markup from user-editable strings (token names, notes).
 * The engine already needed it internally (the hover panel) and a ruleset had
 * re-declared an identical copy; this owns it once.
 *
 * The outcome chat-card builder (`card({ title, lines })`) is deliberately NOT
 * here yet: only one ruleset posts chat cards today, so its shape would be
 * guessed from one witness — build it *with* the second chat-posting ruleset.
 * Source: engine-extraction scan #2, finding 4.
 */

import { battleframeNamespace } from "../api/index";

/** Escapes the five HTML-significant characters. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ChatApi {
  escapeHtml(value: string): string;
}

export function createChatApi(): ChatApi {
  return { escapeHtml };
}

declare global {
  interface BattleframeGameNamespace {
    chat?: ChatApi;
  }
}

/** Installs the chat service onto the shared namespace (before any `init`). */
export function installChatApi(): ChatApi {
  const namespace = battleframeNamespace();
  namespace.chat = namespace.chat ?? createChatApi();
  return namespace.chat;
}

/**
 * Chat service — the neutral HTML-entity escaper every module needs when building
 * markup from user-editable strings (token names, notes), plus a neutral outcome
 * chat-CARD builder so no ruleset hand-concatenates its own card container.
 *
 * The escaper: the engine already needed it internally (the hover panel) and a
 * ruleset had re-declared an identical copy; this owns it once (extraction scan #2,
 * finding 4).
 *
 * The card builder (`card({ title, lines, cssClass })`) was deferred pending a
 * second chat-posting ruleset. It lands now that chat cards are wanted across ALL
 * rulesets: it is a pure CONTAINER — `<div class="battleframe-card [cssClass]">` +
 * an optional `<h3>` title + the caller's pre-built body lines joined verbatim. It
 * does NOT escape: a card mixes safe markup (`<strong>`, `&rarr;`) with dynamic
 * text, so the CALLER escapes the dynamic parts (via `escapeHtml`) exactly as its
 * own hand-built wrapper did. `postCard` is the thin glue that renders a card and
 * posts it as a persistent ChatMessage.
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

export interface ChatCardSpec {
  /** Card heading (pre-escaped by the caller; may contain safe markup). */
  title?: string;
  /** Body fragments (each pre-built HTML, e.g. `<p>…</p>`), joined verbatim. */
  lines?: readonly string[];
  /** Extra class(es) appended to the base `battleframe-card`, for ruleset theming. */
  cssClass?: string;
}

/** The base class every BattleFrame chat card carries, so one stylesheet themes all. */
const CARD_CLASS = "battleframe-card";

/**
 * Builds the neutral outcome-card HTML container. A CONTAINER, not a sanitizer —
 * the caller escapes dynamic text (see the file header).
 */
export function card(spec: ChatCardSpec): string {
  const classes = [CARD_CLASS, spec.cssClass].filter(Boolean).join(" ");
  const title = spec.title ? `<h3 class="${CARD_CLASS}__title">${spec.title}</h3>` : "";
  const body = (spec.lines ?? []).join("");
  return `<div class="${classes}">${title}${body}</div>`;
}

export interface PostCardSpec extends ChatCardSpec {
  /** ChatMessage speaker; defaults to `ChatMessage.getSpeaker()` when available. */
  speaker?: Record<string, unknown>;
  /** Roll objects to attach so Foundry drives breakdowns / Dice So Nice. */
  rolls?: readonly unknown[];
}

interface ChatMessageGlobal {
  ChatMessage?: {
    create: (data: Record<string, unknown>) => Promise<unknown>;
    getSpeaker?: () => Record<string, unknown>;
  };
}

/**
 * Renders a card and posts it as a persistent ChatMessage (the CLAUDE.md-mandated
 * surface for results — not a GM-only toast). No-ops when ChatMessage is absent
 * (the no-Foundry test path), mirroring `postRollToChat`.
 */
export async function postCard(spec: PostCardSpec): Promise<void> {
  const chat = (globalThis as unknown as ChatMessageGlobal).ChatMessage;
  if (!chat?.create) {
    return;
  }
  const speaker = spec.speaker ?? chat.getSpeaker?.();
  await chat.create({
    content: card(spec),
    ...(speaker ? { speaker } : {}),
    ...(spec.rolls && spec.rolls.length > 0 ? { rolls: [...spec.rolls] } : {})
  });
}

export interface ChatApi {
  escapeHtml(value: string): string;
  card(spec: ChatCardSpec): string;
  postCard(spec: PostCardSpec): Promise<void>;
}

export function createChatApi(): ChatApi {
  return { escapeHtml, card, postCard };
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

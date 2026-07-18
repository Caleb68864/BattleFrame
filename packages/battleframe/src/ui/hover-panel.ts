import { getStatVisibilitySetting } from "../settings";
import { installHoverApi } from "./hover-registry";
import type { HoverProvider } from "./hover-registry";
import { isVisibleTo, resolveVisibility, type VisibilitySetting } from "./hover-visibility";
import { buildPanelModel, type PanelModel, type StatusResolver } from "./hover-panel-model";

interface TokenLike {
  actor?: { type?: string; isOwner?: boolean; name?: string; system?: Record<string, unknown>; statuses?: Iterable<string> } | null;
  center?: { x: number; y: number };
  w?: number;
  h?: number;
}

type ProviderLookup = (type: string) => HoverProvider | undefined;

/** Pure decision: should the panel render for this hover? (unit-tested) */
export function shouldRender(
  user: { isGM?: boolean },
  token: TokenLike,
  lookup: ProviderLookup,
  setting: VisibilitySetting,
): boolean {
  const type = token.actor?.type;
  if (!type) return false;
  const provider = lookup(type);
  if (!provider) return false;
  return isVisibleTo(user, token, resolveVisibility(setting, provider));
}

/** CONFIG-backed status resolver: id -> { img, label }. */
function configStatusResolver(): StatusResolver {
  const cfg = (globalThis as { CONFIG?: { statusEffects?: Array<{ id: string; img?: string; icon?: string; name?: string; label?: string }> } }).CONFIG;
  const list = cfg?.statusEffects ?? [];
  return (id) => {
    const e = list.find((s) => s.id === id);
    if (!e) return undefined;
    const img = e.img ?? e.icon;
    if (!img) return undefined;
    return { img, label: e.name ?? e.label ?? id };
  };
}

let panelEl: HTMLElement | undefined;

function ensurePanel(): HTMLElement {
  if (panelEl) return panelEl;
  const el = document.createElement("div");
  el.id = "battleframe-hover-panel";
  el.style.position = "absolute";
  el.style.pointerEvents = "none";
  el.style.display = "none";
  document.body.appendChild(el);
  panelEl = el;
  return el;
}

function renderPanel(model: PanelModel, token: TokenLike): void {
  const el = ensurePanel();
  const rows = model.rows.map((r) => `<div class="bf-hover-row"><span class="bf-hover-label">${r.label}</span><span class="bf-hover-value">${r.text}</span></div>`).join("");
  const statuses = model.statuses.length
    ? `<div class="bf-hover-statuses">${model.statuses.map((s) => `<img src="${s.img}" title="${s.label}" width="18" height="18">`).join("")}</div>`
    : "";
  el.innerHTML = `<div class="bf-hover-name">${model.name}</div>${rows}${statuses}`;
  position(el, token);
  el.style.display = "";
}

/** Places the panel just right of the token, in screen space. Read defensively. */
function position(el: HTMLElement, token: TokenLike): void {
  const canvas = (globalThis as { canvas?: { stage?: { worldTransform?: DOMMatrix } } }).canvas;
  const t = canvas?.stage?.worldTransform;
  const c = token.center;
  if (!t || !c) return;
  const screenX = t.a * c.x + t.c * c.y + t.e;
  const screenY = t.b * c.x + t.d * c.y + t.f;
  el.style.left = `${screenX + ((token.w ?? 0) / 2) * (t.a ?? 1) + 8}px`;
  el.style.top = `${screenY}px`;
}

function hidePanel(): void {
  if (panelEl) panelEl.style.display = "none";
}

/** Registers the hoverToken hook. Side-effect at import (see ../battleframe.ts). */
export function registerHoverPanel(): void {
  const hooks = (globalThis as { Hooks?: { on: (e: string, cb: (...a: unknown[]) => void) => void } }).Hooks;
  if (!hooks) return;
  const registry = installHoverApi();

  hooks.on("hoverToken", (...args: unknown[]) => {
    const token = args[0] as TokenLike;
    const hovered = args[1] as boolean;
    if (!hovered) { hidePanel(); return; }

    const user = (globalThis as { game?: { user?: { isGM?: boolean } } }).game?.user ?? {};
    if (!shouldRender(user, token, (type) => registry.get(type), getStatVisibilitySetting())) { hidePanel(); return; }

    const provider = registry.get(token.actor!.type!)!;
    const model = buildPanelModel(token.actor!, provider, configStatusResolver());
    renderPanel(model, token);
  });

  hooks.on("canvasPan", hidePanel);
  hooks.on("deleteToken", hidePanel);
}

registerHoverPanel();

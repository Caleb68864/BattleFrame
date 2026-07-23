/**
 * Full Thrust actions on the token right-click HUD -- the highest-value
 * discoverability fix. A live playtester instinctively RIGHT-CLICKED a ship and
 * got Foundry's default token HUD, not the Full Thrust actions (which lived only
 * in a dense scene-control cluster). This hooks Foundry's own `renderTokenHUD` and
 * injects the ship's live actions straight onto that HUD, per token.
 *
 * Because the HUD is per token it knows exactly which ship it is for, so it shows
 * only the actions that ship can take right now (via the pure `availableShipActions`
 * -- Plot when it can still manoeuvre, Fire when a live weapon + fire control
 * remain, and the weapon-specific actions only when that weapon is actually
 * mounted and undamaged). A plain beam frigate shows Plot + Fire and nothing else.
 *
 * The buttons run the SAME actions the scene tools run (from `round-control.ts`),
 * first controlling the token so the actions' `controlledToken()` resolves to it.
 *
 * Kept behind a clean seam (`registerTokenHudActions`, a pure model builder, a
 * DOM-tolerant injector) so it can later be lifted to the engine for other
 * rulesets -- but it is FT-local now (it maps FT ship actions).
 */

import { MODULE_ID, SHIP_ACTOR_TYPE } from "../constants";
import { availableShipActions, type ShipActionAvailability } from "../ship/ship-actions";
import {
  plotAction,
  fireAction,
  splitFireAction,
  needleAction,
  salvoAction,
  fireNovaCannonAction,
  fireWaveGunAction,
  launchFightersAction,
  recoverFightersAction,
  holdShipAction,
  runGuarded
} from "./round-control";

/** The Actor.type a Full Thrust ship carries (module-namespaced subtype). */
const SHIP_TYPE = `${MODULE_ID}.${SHIP_ACTOR_TYPE}`;

/** One HUD button: its stable key, icon, tooltip, action, and the availability
 * flag that gates it (omitted for buttons every ship always shows, like Hold). */
export interface HudButtonModel {
  key: string;
  icon: string;
  tooltipKey: string;
  tooltipFallback: string;
  action: () => unknown;
  /** When set, the button shows only if this ShipActionAvailability flag is live;
   * when omitted the button shows for every Full Thrust ship. */
  availability?: keyof ShipActionAvailability;
}

/**
 * The full ordered catalogue of HUD buttons. Plot + Fire lead (the everyday
 * actions the playtester was hunting for); the weapon-specific ones follow and
 * only render when their availability flag is set. Icons reuse the scene tools'
 * FontAwesome glyphs so the two entry points read as the same action.
 */
const BUTTON_CATALOGUE: readonly HudButtonModel[] = [
  { key: "plot", availability: "plot", icon: "fa-route", tooltipKey: `${MODULE_ID}.controls.plot`, tooltipFallback: "Plot movement order", action: plotAction },
  { key: "fire", availability: "fire", icon: "fa-crosshairs", tooltipKey: `${MODULE_ID}.controls.fire`, tooltipFallback: "Fire at target", action: fireAction },
  { key: "splitFire", availability: "splitFire", icon: "fa-arrows-split-up-and-left", tooltipKey: `${MODULE_ID}.controls.splitFire`, tooltipFallback: "Split fire across targets", action: splitFireAction },
  { key: "needle", availability: "needle", icon: "fa-syringe", tooltipKey: `${MODULE_ID}.controls.needle`, tooltipFallback: "Needle beam", action: needleAction },
  { key: "salvo", availability: "salvo", icon: "fa-meteor", tooltipKey: `${MODULE_ID}.controls.salvo`, tooltipFallback: "Fire salvo missiles", action: salvoAction },
  { key: "nova", availability: "nova", icon: "fa-sun", tooltipKey: `${MODULE_ID}.controls.novaCannon`, tooltipFallback: "Fire Nova Cannon", action: fireNovaCannonAction },
  { key: "waveGun", availability: "waveGun", icon: "fa-water", tooltipKey: `${MODULE_ID}.controls.waveGun`, tooltipFallback: "Fire Wave Gun", action: fireWaveGunAction },
  { key: "launchFighters", availability: "launchFighters", icon: "fa-plane-departure", tooltipKey: `${MODULE_ID}.controls.launchFighters`, tooltipFallback: "Launch fighters", action: launchFightersAction },
  { key: "recoverFighters", availability: "recoverFighters", icon: "fa-plane-arrival", tooltipKey: `${MODULE_ID}.controls.recoverFighters`, tooltipFallback: "Recover fighters", action: recoverFightersAction },
  // Hold/Done: always available on a ship -- marks it finished for this phase so the
  // premature-ready guard stops nagging about it. Not gated by any weapon/system.
  { key: "hold", icon: "fa-circle-check", tooltipKey: `${MODULE_ID}.controls.hold`, tooltipFallback: "Hold / Done (skip this ship this phase)", action: holdShipAction }
];

/**
 * The HUD buttons a token should show: none unless it is a Full Thrust ship, then
 * only those whose availability flag is live for its current system + damage state.
 * Pure -- no DOM, no Foundry -- so it is unit-tested directly.
 */
export function hudButtonModels(actor: { type?: string; system?: unknown } | undefined): HudButtonModel[] {
  if (actor?.type !== SHIP_TYPE) {
    return [];
  }
  const available = availableShipActions((actor.system ?? {}) as any);
  // A button with no `availability` gate always shows for a ship (e.g. Hold);
  // otherwise it shows only when its availability flag is live.
  return BUTTON_CATALOGUE.filter((model) => model.availability === undefined || available[model.availability]);
}

// --- DOM injection (DOM-tolerant so it tests with a fake element) ------------

interface HudButtonEl {
  className: string;
  innerHTML: string;
  setAttribute: (name: string, value: string) => void;
  addEventListener: (type: string, cb: () => void) => void;
}

interface HudColEl {
  appendChild: (el: HudButtonEl) => void;
}

interface HudRootEl {
  ownerDocument?: { createElement: (tag: string) => HudButtonEl };
  querySelector: (sel: string) => HudColEl | null;
}

/** Localizes a tooltip, falling back to English when i18n is not live (tests). */
function tooltip(model: HudButtonModel): string {
  const i18n = (globalThis as any).game?.i18n;
  const localized = i18n?.localize?.(model.tooltipKey);
  return localized && localized !== model.tooltipKey ? localized : model.tooltipFallback;
}

/**
 * Injects one native-looking control button per model into the token HUD,
 * preferring the right column (falling back to the left), and wires each click to
 * `onAction(key)`. Returns the number of buttons injected. Uses only the standard
 * DOM surface (`ownerDocument.createElement`, `querySelector`, `appendChild`,
 * `setAttribute`, `addEventListener`) so a real `HTMLElement` and a lightweight
 * test fake both satisfy it. Reusing Foundry's `.control-icon` class gives the
 * buttons the HUD's native look with no extra CSS.
 */
export function injectShipHudButtons(
  root: HudRootEl,
  models: readonly HudButtonModel[],
  onAction: (key: HudButtonModel["key"]) => void
): number {
  if (models.length === 0) {
    return 0;
  }
  const doc = root.ownerDocument;
  const col = root.querySelector(".col.right") ?? root.querySelector(".col.left");
  if (!doc || !col) {
    return 0;
  }
  let injected = 0;
  for (const model of models) {
    const btn = doc.createElement("button");
    btn.className = `control-icon ${MODULE_ID}-hud-action`;
    btn.setAttribute("type", "button");
    btn.setAttribute("data-action", String(model.key));
    const label = tooltip(model);
    btn.setAttribute("data-tooltip", label);
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `<i class="fas ${model.icon}"></i>`;
    btn.addEventListener("click", () => onAction(model.key));
    col.appendChild(btn);
    injected += 1;
  }
  return injected;
}

/** Foundry may hand the hook an `HTMLElement` (v13+) or a jQuery object (its
 * `[0]` is the element). Normalizes to the raw element. */
function rootElement(html: unknown): HudRootEl | undefined {
  if (!html) {
    return undefined;
  }
  if (typeof (html as any).querySelector === "function") {
    return html as HudRootEl;
  }
  const first = (html as any)[0];
  return first && typeof first.querySelector === "function" ? (first as HudRootEl) : undefined;
}

/**
 * Runs a HUD action for its token: control the token first (so the shared actions'
 * `controlledToken()` resolves to THIS ship), then run the mapped action through
 * the same guard the scene tools use. Fire-type actions also need a *target*; the
 * player still targets an enemy (T) as before -- the HUD only supplies the actor.
 */
function runHudAction(model: HudButtonModel, token: any): void {
  runGuarded(async () => {
    token?.control?.({ releaseOthers: true });
    await model.action();
  });
}

/** Registers the renderTokenHUD hook that injects FT ship action buttons. */
export function registerTokenHudActions(): void {
  const hooks = (globalThis as any).Hooks;
  if (!hooks?.on) {
    return;
  }
  hooks.on("renderTokenHUD", (hud: any, html: unknown) => {
    const token = hud?.object;
    const models = hudButtonModels(token?.actor);
    if (models.length === 0) {
      return;
    }
    const root = rootElement(html);
    if (!root) {
      return;
    }
    const byKey = new Map(models.map((m) => [m.key, m]));
    injectShipHudButtons(root, models, (key) => {
      const model = byKey.get(key);
      if (model) {
        runHudAction(model, token);
      }
    });
  });
}

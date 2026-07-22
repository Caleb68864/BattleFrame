/**
 * Selection service — neutral reads of the user's current token selection and
 * targets. Every ruleset's turn UI needs "the token the user selected" and "the
 * token(s) the user targeted"; three modules independently re-implemented the
 * same two Foundry reads with the same defensiveness (Foundry's `targets` is a
 * `Set` with `.first()`; controlled is an array that may be absent). This owns
 * that neutral read once; what a token MEANS (a ship, a unit) stays the ruleset's.
 *
 * Returns raw placeables (structural `unknown`), never a domain type — the same
 * contract `measure` uses. Source: engine-extraction scan #2, finding 1.
 */

import { battleframeNamespace } from "../api/index";

export interface SelectionApi {
  /** Every token the user currently controls (empty array if none / no canvas). */
  controlled(): unknown[];
  /** The single controlled token, or undefined if zero or more than one. */
  controlledOne(): unknown | undefined;
  /** Every token the user currently targets (empty array if none). */
  targets(): unknown[];
  /** The first targeted token, or undefined if none. */
  firstTarget(): unknown | undefined;
}

interface SelectionGlobals {
  canvas?: { tokens?: { controlled?: unknown[] } };
  game?: { user?: { targets?: Iterable<unknown> } };
}

function globals(): SelectionGlobals {
  return globalThis as unknown as SelectionGlobals;
}

export function createSelectionApi(): SelectionApi {
  const controlled = (): unknown[] => {
    const list = globals().canvas?.tokens?.controlled;
    return Array.isArray(list) ? list : [];
  };
  const controlledOne = (): unknown | undefined => {
    const list = controlled();
    return list.length === 1 ? list[0] : undefined;
  };
  const targets = (): unknown[] => {
    const set = globals().game?.user?.targets;
    if (!set || typeof (set as any)[Symbol.iterator] !== "function") {
      return [];
    }
    return Array.from(set);
  };
  const firstTarget = (): unknown | undefined => targets()[0];

  return { controlled, controlledOne, targets, firstTarget };
}

declare global {
  interface BattleframeGameNamespace {
    selection?: SelectionApi;
  }
}

/** Installs the selection service onto the shared namespace (before any `init`). */
export function installSelectionApi(): SelectionApi {
  const namespace = battleframeNamespace();
  namespace.selection = namespace.selection ?? createSelectionApi();
  return namespace.selection;
}

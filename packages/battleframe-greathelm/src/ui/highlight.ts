import { MODULE_ID } from "../constants";
import { actionForFace, requiresClashTest } from "../round/actions";
import type { LegalTarget, RoundSession, RoundSessionDie } from "../round/session";

/** A knight as highlighting needs it: an id to match session legality, and an opaque handle for the tint API. */
export interface HighlightKnight {
  id: string;
  token: unknown;
}

/**
 * The tint-writing capability, injected so this module never touches a real
 * PIXI/Foundry object directly and stays unit-testable without a canvas.
 * `setTint(token, undefined)` clears any tint previously applied to that
 * token -- callers rely on this for the "no leaked tints" lifecycle
 * guarantee below.
 */
export interface TintApiLike {
  setTint: (token: unknown, color: number | undefined) => void;
}

/** Legal, non-contact target (movement dice: sprint/encircle/shift). */
export const LEGAL_TINT_COLOR = 0x33cc66;
/** Legal target of a clash-requiring die -- implies base contact, per the session. */
export const CONTACT_TINT_COLOR = 0xff9900;

export interface ApplyHighlightsOptions {
  session: RoundSession;
  knights: readonly HighlightKnight[];
  selectedDieId: string | undefined;
  /** Feature-detected once by the caller (see resolveTintApi) -- undefined means "unavailable on this client". */
  tintApi: TintApiLike | undefined;
  log?: (message: string) => void;
}

function defaultLog(message: string): void {
  console.debug(message);
}

/** Clears every knight's tint. Safe to call with no prior tint applied, and safe with a missing tintApi. */
export function clearHighlights(
  knights: readonly HighlightKnight[],
  tintApi: TintApiLike | undefined
): void {
  if (!tintApi) {
    return;
  }

  for (const knight of knights) {
    tintApi.setTint(knight.token, undefined);
  }
}

function findSelectedDie(session: RoundSession, dieId: string): RoundSessionDie | undefined {
  return session.remainingDice().find((die) => die.id === dieId);
}

/**
 * Applies (or clears) canvas highlighting for the current die selection.
 *
 * Legality is read verbatim from `session.legalTargetsFor` -- this file does
 * no contact maths of its own; that lives in combat/clash.ts and is reached
 * only through the session (see round/session.ts). A legal target of a
 * clash-requiring die (bash/light/heavy) is tinted as a base-contact pair,
 * since the session would not report it legal without contact; a legal
 * target of a movement die is tinted plainly legal. Illegal knights and
 * every knight once no die is selected are left untinted.
 *
 * If `tintApi` is unavailable (the v14 tinting API could not be resolved on
 * this client -- see resolveTintApi below), highlighting is skipped
 * entirely: one debug line is logged and nothing is tinted. This function
 * never throws -- a missing tint API degrades to "no highlights", not a
 * broken round.
 */
export function applyHighlights(options: ApplyHighlightsOptions): void {
  const { session, knights, selectedDieId, tintApi, log = defaultLog } = options;

  if (!tintApi) {
    log(`${MODULE_ID} | highlight: tinting API unavailable on this client, skipping`);

    return;
  }

  if (!selectedDieId) {
    clearHighlights(knights, tintApi);

    return;
  }

  let targets: LegalTarget[];

  try {
    targets = session.legalTargetsFor(selectedDieId);
  } catch {
    clearHighlights(knights, tintApi);

    return;
  }

  const die = findSelectedDie(session, selectedDieId);
  const isContactAction = die !== undefined && requiresClashTest(actionForFace(die.face));
  const targetsById = new Map(targets.map((target) => [target.knightId, target]));

  for (const knight of knights) {
    const target = targetsById.get(knight.id);

    if (!target?.legal) {
      tintApi.setTint(knight.token, undefined);
      continue;
    }

    tintApi.setTint(knight.token, isContactAction ? CONTACT_TINT_COLOR : LEGAL_TINT_COLOR);
  }
}

export interface HighlightController {
  /** Re-applies highlights for `selectedDieId`. Force-clears instead if the round has completed underneath it. */
  update(selectedDieId: string | undefined): void;
  /** Clears any active highlight. Call this on die deselection, round end, and panel close alike. */
  close(): void;
}

export interface CreateHighlightControllerOptions {
  session: RoundSession;
  knights: readonly HighlightKnight[];
  tintApi: TintApiLike | undefined;
  log?: (message: string) => void;
}

/**
 * Binds `applyHighlights`/`clearHighlights` to one call site's lifecycle, so
 * every place highlighting needs to go away -- die deselection (pass
 * `undefined`), round end (`isComplete()` short-circuits to a clear even if
 * the caller hasn't noticed the selection is now stale), and panel close
 * (`close()`) -- goes through the same two functions instead of three
 * separately-maintained call sites.
 */
export function createHighlightController(options: CreateHighlightControllerOptions): HighlightController {
  const { session, knights, tintApi, log } = options;

  return {
    update(selectedDieId) {
      if (session.isComplete()) {
        clearHighlights(knights, tintApi);

        return;
      }

      applyHighlights({ session, knights, selectedDieId, tintApi, log });
    },
    close() {
      clearHighlights(knights, tintApi);
    },
  };
}

/* ------------------------------------------------------------------------ *
 * Foundry glue
 * ------------------------------------------------------------------------ */

interface TokenMeshLike {
  tint?: number;
}

interface CanvasTokenPlaceableLike {
  tint?: number;
  mesh?: TokenMeshLike;
  refresh?: () => void;
}

/**
 * Probes for a v14 token-tint write, in order of plausibility.
 *
 * >>> UNVERIFIED against Foundry v14. <<< vault/foundry-systems/ carries no
 * note on the tinting API at any confidence -- not `confirmed`, not
 * `unverified`, none (see the sub-spec's HUMAN REVIEW criterion, which asks
 * whoever runs the live check to record it there afterwards). Nothing in
 * this repo has ever called it. Rather than assert one remembered shape
 * (the `getSceneControlButtons` mistake this sub-spec is explicitly told not
 * to repeat), this tries a couple of plausible placeable shapes and returns
 * the first that accepts a write without throwing. If none apply, it
 * returns undefined and the caller degrades per applyHighlights above.
 */
export function resolveTintApi(): TintApiLike | undefined {
  try {
    const globalScope = globalThis as unknown as {
      canvas?: { tokens?: { placeables?: CanvasTokenPlaceableLike[] } };
    };

    if (!globalScope.canvas?.tokens?.placeables) {
      return undefined;
    }

    return {
      setTint: (token, color) => {
        const placeable = token as CanvasTokenPlaceableLike | undefined;

        if (!placeable) {
          return;
        }

        if (placeable.mesh && "tint" in placeable.mesh) {
          placeable.mesh.tint = color ?? 0xffffff;
        } else if ("tint" in placeable) {
          placeable.tint = color ?? 0xffffff;
        } else {
          return;
        }

        placeable.refresh?.();
      },
    };
  } catch {
    return undefined;
  }
}

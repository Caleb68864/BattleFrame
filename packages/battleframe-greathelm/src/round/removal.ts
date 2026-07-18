/**
 * The two ways a knight leaves the play area, in one place.
 *
 * QSR p2 gives exactly two: three damage markers, or fleeing a failed courage
 * test. `victory.ts` already documented them as identical -- "A knight leaves
 * by damage (3 markers) or by fleeing a failed courage test -- QSR p2 treats
 * both identically, and so does `isRemoved`" -- while the only `isRemoved` in
 * the codebase checked damage and nothing else. The comment was right and the
 * code was wrong, so the check lives here now and both callers share it rather
 * than each carrying half the rule.
 *
 * Removal is read from the Actor, never cached: a knight downed or routed
 * mid-round must drop out on the next call, not on a snapshot taken when the
 * round began. See `RoundSessionKnight.isRemoved`.
 */
import { MODULE_ID } from "../constants";
import type { ActorLike } from "./loop";

/**
 * Damage markers at which a knight is removed immediately (QSR p2, see
 * vault/greathelm/damage-and-removal.md and data/knight.ts's schema cap).
 */
export const DAMAGE_LIMIT = 3;

/** Flag key under this module's namespace. Flags are per-document, so a fled knight stays fled across a reload. */
export const FLED_FLAG = "fled";

/**
 * Whether this knight fled a courage test.
 *
 * Namespaced under `flags[MODULE_ID]` rather than added to the knight schema
 * on purpose: fleeing is a scenario state, not a stat, and `data/knight.ts` is
 * "deliberately minimal: momentum and damage markers". A flag also needs no
 * migration for worlds whose knights predate this check.
 */
export function hasFled(actor: ActorLike): boolean {
  return actor.flags?.[MODULE_ID]?.[FLED_FLAG] === true;
}

/** Whether this knight is out of the play area, by either QSR route. */
export function isKnightRemoved(actor: ActorLike): boolean {
  return hasFled(actor) || (actor.system?.damage ?? 0) >= DAMAGE_LIMIT;
}

/** Foundry's core "defeated" status id (the skull overlay), or its documented `"dead"` fallback. */
function defeatedStatusId(): string {
  const config = (globalThis as unknown as {
    CONFIG?: { specialStatusEffects?: { DEFEATED?: string } };
  }).CONFIG;
  return config?.specialStatusEffects?.DEFEATED ?? "dead";
}

/**
 * Surfaces removal on the token via Foundry's native "defeated" status,
 * matching `isKnightRemoved`: a knight downed (3 damage) or fled shows a skull
 * that syncs to every client and persists on the document, instead of only an
 * invisible marker count (roadmap P1). Damage/momentum stay `NumberField`s;
 * only the threshold/flag condition goes native. Idempotent, and a no-op on an
 * actor with no `toggleStatusEffect` (tests, plain objects).
 */
export async function syncKnightDefeatedStatus(actor: ActorLike): Promise<void> {
  await actor.toggleStatusEffect?.(defeatedStatusId(), { active: isKnightRemoved(actor) });
}

/**
 * Records that a knight fled, on the Actor, so the removal survives a reload
 * for the same reason `applyClashDamage` writes wounds to the document rather
 * than to round state.
 *
 * Idempotent -- a knight already flagged is not written again. The courage
 * phase can only flee a knight once, but re-entering a round should not
 * produce a database write per knight per round.
 */
export async function markFled(actor: ActorLike): Promise<void> {
  if (hasFled(actor)) {
    return;
  }

  await actor.update({ [`flags.${MODULE_ID}.${FLED_FLAG}`]: true });
  // Fleeing removes a knight from play immediately (QSR p2) -- show it.
  await syncKnightDefeatedStatus(actor);
}

/**
 * Returns a knight to pristine, fresh-battle state: no wounds, no momentum, not
 * fled. The inverse of the two removal routes plus the momentum a battle
 * accrues.
 *
 * `system.damage` persists on the document (`applyClashDamage` writes it),
 * `fled` persists as a flag (`markFled`), and momentum is a per-battle stat --
 * none of them reset on their own, so without this a second battle began with
 * every knight still carrying the first battle's wounds and flight, and the
 * victory check would fire before a die was thrown. All three are cleared in a
 * single `actor.update` so the document takes one write, not three.
 *
 * The flag is *deleted* (`-=` is Foundry's key-removal idiom in update data),
 * the exact inverse of `markFled` setting it, rather than left as `false`
 * cruft in the flag bag.
 */
export async function resetKnight(actor: ActorLike): Promise<void> {
  await actor.update({
    "system.damage": 0,
    "system.momentum": 0,
    [`flags.${MODULE_ID}.-=${FLED_FLAG}`]: null,
  });
  // A reset knight is back in play -- clear the skull the removal put on it.
  await syncKnightDefeatedStatus(actor);
}

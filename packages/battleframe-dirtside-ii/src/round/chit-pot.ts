/**
 * G5 — the damage-chit pot draw (build plan §2). A world Foundry RollTable IS the
 * pot (a without-replacement bag the user populates once with chit-code
 * TableResults). This glue draws N codes and returns them to the pure
 * `resolveChitDraw`; the resolver never touches Foundry.
 *
 * Foundry-facing → the parent LIVE-VERIFIES that v14 `RollTable#drawMany(n)`
 * honours `replacement:false` and `reset()` returns every chit before the next
 * hit. If it does not, only this one function swaps to the module-multiset
 * fallback (plan §2 (b)); the resolver is unaffected. The code EXTRACTION below
 * is pure + unit-tested.
 */

export interface TableResultLike {
  text?: string;
  description?: string;
  name?: string;
}

/** Reads the chit code off one TableResult (text → description → name), trimmed. */
export function chitCodeOf(result: TableResultLike): string {
  return (result.text ?? result.description ?? result.name ?? "").trim();
}

/** Maps a drawn result set to its chit codes. */
export function chitCodesFromResults(results: readonly TableResultLike[]): string[] {
  return results.map(chitCodeOf);
}

export interface RollTableLike {
  replacement?: boolean;
  drawMany(n: number, options?: { displayChat?: boolean }): Promise<{ results: TableResultLike[] }>;
  reset(): Promise<unknown>;
  update?(data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Draws `n` chit codes without replacement from the pot, then resets it so every
 * chit is back before the next hit. Returns `[]` when no usable table is given.
 */
export async function drawChits(table: RollTableLike | undefined, n: number): Promise<string[]> {
  if (!table?.drawMany) {
    return [];
  }
  // The pot must be a without-replacement bag; drawMany marks entries used.
  if (table.replacement !== false && table.update) {
    try {
      await table.update({ replacement: false });
    } catch {
      /* best effort — a read-only compendium table still draws */
    }
  }
  const draw = await table.drawMany(n, { displayChat: false });
  const codes = chitCodesFromResults(draw?.results ?? []);
  await table.reset?.();
  return codes;
}

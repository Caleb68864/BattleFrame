import type { DieType } from "../dice/ladder";

/**
 * A single figure on a unit's roster — the die it is thrown as AND the casualty
 * surface. `wounds` is 0..2 (a second wound this resolution kills); `status`
 * tracks the live condition. Matches the `figures[]` schema element.
 */
export interface Figure {
  name: string;
  armour: DieType;
  weaponId: string;
  wounds: number;
  status: "ok" | "wounded" | "dead";
}

export interface CasualtyCounts {
  wounds: number;
  kills: number;
}

export interface AllocationResult {
  figures: Figure[];
  /** True once every figure on the roster is dead. */
  wiped: boolean;
}

/**
 * B8 — distribute a resolution's `kills` and `wounds` randomly across the LIVING
 * figures. Kills are applied first (outright death); each wound increments a
 * figure's wound count and a figure reaching 2 wounds dies. A casualty never
 * lands on an already-dead figure; excess hits with no living target are lost.
 * `rng()` returns `[0,1)` and is injected for determinism. The input roster is
 * not mutated.
 */
export function allocateCasualties(
  figures: readonly Figure[],
  counts: CasualtyCounts,
  rng: () => number
): AllocationResult {
  const roster: Figure[] = figures.map((f) => ({ ...f }));

  const living = (): number[] =>
    roster.map((f, i) => (f.status === "dead" ? -1 : i)).filter((i) => i >= 0);

  const pick = (pool: number[]): number => pool[Math.floor(rng() * pool.length)];

  for (let k = 0; k < counts.kills; k += 1) {
    const pool = living();
    if (pool.length === 0) {
      break;
    }
    const target = roster[pick(pool)];
    target.status = "dead";
    target.wounds = 2;
  }

  for (let w = 0; w < counts.wounds; w += 1) {
    const pool = living();
    if (pool.length === 0) {
      break;
    }
    const target = roster[pick(pool)];
    target.wounds += 1;
    target.status = target.wounds >= 2 ? "dead" : "wounded";
  }

  return { figures: roster, wiped: roster.every((f) => f.status === "dead") };
}

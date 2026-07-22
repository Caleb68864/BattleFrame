/**
 * The weapons-fire phase turn structure: each side rolls for initiative, the
 * winner fires one ship in full, then the sides alternate one ship each until
 * all firing is done -- skipping a side that has no ships left to fire. Pure and
 * serialisable; the scene-control glue drives it and persists its state to a
 * Combat flag, and calls fireShipAtTarget to resolve each ship's fire.
 *
 * Source: FT2 "Initiative", "Sequence of Play".
 */

export interface InitiativeRoll {
  sideId: string;
  roll: number;
}

/**
 * The side that won initiative (highest roll), or null on a tie so the caller
 * rerolls. Assumes exactly the two sides' rolls.
 */
export function determineInitiative(rolls: readonly InitiativeRoll[]): string | null {
  let best: InitiativeRoll | undefined;
  let tied = false;
  for (const entry of rolls) {
    if (!best || entry.roll > best.roll) {
      best = entry;
      tied = false;
    } else if (entry.roll === best.roll) {
      tied = true;
    }
  }
  return best && !tied ? best.sideId : null;
}

export interface FirePhaseShip {
  id: string;
  sideId: string;
}

export interface CreateFirePhaseParams {
  ships: readonly FirePhaseShip[];
  firstSideId: string;
  /** Restore point: ids that have already fired. */
  fired?: readonly string[];
  /** Restore point: the side currently active. */
  activeSideId?: string;
}

export interface FirePhase {
  activeSide(): string | undefined;
  eligible(): string[];
  fire(shipId: string): void;
  isComplete(): boolean;
  serialize(): { fired: string[]; activeSideId: string | undefined; firstSideId: string };
}

export function createFirePhase(params: CreateFirePhaseParams): FirePhase {
  const { ships, firstSideId } = params;
  const fired = new Set(params.fired ?? []);

  const sides = [...new Set(ships.map((s) => s.sideId))];
  const otherSide = (side: string | undefined): string | undefined =>
    sides.find((s) => s !== side);

  let active: string | undefined = params.activeSideId ?? firstSideId;

  function unfiredOn(side: string | undefined): string[] {
    return ships.filter((s) => s.sideId === side && !fired.has(s.id)).map((s) => s.id);
  }

  /** Advance to the next side that still has a ship to fire, or undefined. */
  function advance(): void {
    const next = otherSide(active);
    if (unfiredOn(next).length > 0) {
      active = next;
    } else if (unfiredOn(active).length > 0) {
      // Keep the current side if the other is exhausted.
    } else {
      active = undefined;
    }
  }

  return {
    activeSide: () => (isComplete() ? undefined : active),
    eligible: () => unfiredOn(active),
    fire(shipId: string): void {
      const ship = ships.find((s) => s.id === shipId);
      if (!ship) {
        throw new Error(`unknown ship: ${shipId}`);
      }
      if (fired.has(shipId)) {
        throw new Error(`ship already fired: ${shipId}`);
      }
      if (ship.sideId !== active) {
        throw new Error(`ship ${shipId} is not the active side (${active})`);
      }
      fired.add(shipId);
      advance();
    },
    isComplete,
    serialize: () => ({ fired: [...fired], activeSideId: active, firstSideId })
  };

  function isComplete(): boolean {
    return ships.every((s) => fired.has(s.id));
  }
}

import { describe, expect, it, vi } from "vitest";
import { MODULE_ID } from "../src/constants";
import {
  DAMAGE_LIMIT,
  hasFled,
  isKnightRemoved,
  markFled,
} from "../src/round/removal";
import { checkVictory } from "../src/round/victory";
import { toVictoryKnights } from "../src/ui/round-control";
import type { ActorLike } from "../src/round/loop";

function actor(overrides: Partial<ActorLike> = {}): ActorLike {
  return {
    system: { damage: 0 },
    flags: {},
    update: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("isKnightRemoved", () => {
  it("treats a knight at the damage limit as removed", () => {
    expect(isKnightRemoved(actor({ system: { damage: DAMAGE_LIMIT } }))).toBe(true);
  });

  it("leaves a knight below the damage limit in play", () => {
    expect(isKnightRemoved(actor({ system: { damage: DAMAGE_LIMIT - 1 } }))).toBe(false);
  });

  // The bug this module exists to close: victory.ts documents damage and
  // fleeing as identical routes out of play, and round-control checked only
  // damage. An undamaged knight that fled stayed "in play" forever.
  it("treats an undamaged knight that fled as removed", () => {
    const fled = actor({ system: { damage: 0 }, flags: { [MODULE_ID]: { fled: true } } });

    expect(isKnightRemoved(fled)).toBe(true);
  });

  it("reads the flag namespaced to this module, not a bare fled key", () => {
    const foreign = actor({ flags: { "some-other-module": { fled: true } } });

    expect(isKnightRemoved(foreign)).toBe(false);
  });

  it("treats a knight with no flags at all as in play", () => {
    expect(isKnightRemoved({ update: vi.fn(async () => undefined) })).toBe(false);
  });
});

describe("markFled", () => {
  it("persists via actor.update so the flight survives a reload", async () => {
    const knight = actor();
    await markFled(knight);

    expect(knight.update).toHaveBeenCalledWith({ [`flags.${MODULE_ID}.fled`]: true });
  });

  it("is idempotent: an already-fled knight is not written again", async () => {
    const knight = actor({ flags: { [MODULE_ID]: { fled: true } } });
    await markFled(knight);

    expect(knight.update).not.toHaveBeenCalled();
  });
});

describe("hasFled", () => {
  it("is false by default and true once flagged", () => {
    expect(hasFled(actor())).toBe(false);
    expect(hasFled(actor({ flags: { [MODULE_ID]: { fled: true } } }))).toBe(true);
  });
});

/**
 * The wiring, not the rule. `checkVictory` was always correct; it was being
 * handed `RoundKnight`s, which carry no `isRemoved` at all, and
 * `CheckVictoryKnight.isRemoved` is optional -- so it typechecked, read every
 * knight as in play, and returned "continue" forever.
 */
describe("toVictoryKnights", () => {
  function roundKnight(id: string, playerId: string, actorOverrides: Partial<ActorLike> = {}) {
    return { id, playerId, actor: actor(actorOverrides) };
  }

  it("wins the game for the side whose opponent is all dead", () => {
    const knights = [
      roundKnight("a", "friendly"),
      roundKnight("b", "hostile", { system: { damage: DAMAGE_LIMIT } }),
    ];

    expect(checkVictory(toVictoryKnights(knights))).toEqual({
      result: "winner",
      playerId: "friendly",
    });
  });

  it("wins the game for the side whose opponent has fled -- undamaged", () => {
    const knights = [
      roundKnight("a", "friendly"),
      roundKnight("b", "hostile", { flags: { [MODULE_ID]: { fled: true } } }),
    ];

    expect(checkVictory(toVictoryKnights(knights))).toEqual({
      result: "winner",
      playerId: "friendly",
    });
  });

  it("keeps playing while both sides hold the field", () => {
    const knights = [roundKnight("a", "friendly"), roundKnight("b", "hostile")];

    expect(checkVictory(toVictoryKnights(knights))).toEqual({ result: "continue" });
  });

  it("reports a mutual wipe-out rather than inventing a winner", () => {
    const knights = [
      roundKnight("a", "friendly", { system: { damage: DAMAGE_LIMIT } }),
      roundKnight("b", "hostile", { flags: { [MODULE_ID]: { fled: true } } }),
    ];

    expect(checkVictory(toVictoryKnights(knights))).toEqual({
      result: "mutual-elimination-unresolved",
    });
  });

  it("re-reads the actor on every call, never snapshotting", () => {
    const knight = roundKnight("a", "friendly");
    const [victoryKnight] = toVictoryKnights([knight]);

    expect(victoryKnight.isRemoved?.()).toBe(false);
    knight.actor.system = { damage: DAMAGE_LIMIT };
    expect(victoryKnight.isRemoved?.()).toBe(true);
  });
});

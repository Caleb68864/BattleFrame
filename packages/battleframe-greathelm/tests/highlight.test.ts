import { describe, expect, it, vi } from "vitest";
import {
  applyHighlights,
  clearHighlights,
  CONTACT_TINT_COLOR,
  LEGAL_TINT_COLOR,
  resolveTintApi,
  type HighlightKnight,
  type TintApiLike,
} from "../src/ui/highlight";
import type { LegalTarget, RoundSession, RoundSessionDie } from "../src/round/session";

function fakeSession(overrides: Partial<RoundSession> = {}): RoundSession {
  return {
    remainingDice: () => [],
    legalTargetsFor: () => [],
    spendDie: vi.fn(async () => undefined),
    discardDie: vi.fn(async () => undefined),
    isComplete: () => false,
    activePlayerId: () => undefined,
    courageOutcomes: () => undefined,
    ...overrides,
  };
}

function fakeTintApi(): TintApiLike & { calls: Array<[unknown, number | undefined]> } {
  const calls: Array<[unknown, number | undefined]> = [];

  return {
    calls,
    setTint: (token, color) => {
      calls.push([token, color]);
    },
  };
}

const KNIGHT_A: HighlightKnight = { id: "a1", token: { id: "a1-token" } };
const KNIGHT_B: HighlightKnight = { id: "b1", token: { id: "b1-token" } };
const KNIGHTS = [KNIGHT_A, KNIGHT_B];

describe("applyHighlights", () => {
  it("tints legal targets of a movement die as plain-legal, leaves illegal targets untinted", () => {
    const dice: RoundSessionDie[] = [{ id: "a-d1", playerId: "a", face: 6 }];
    const targets: LegalTarget[] = [
      { knightId: "a1", legal: true },
      { knightId: "b1", legal: false, reason: "knight-removed" },
    ];
    const session = fakeSession({
      remainingDice: () => dice,
      legalTargetsFor: () => targets,
    });
    const tintApi = fakeTintApi();

    applyHighlights({ session, knights: KNIGHTS, selectedDieId: "a-d1", tintApi });

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, LEGAL_TINT_COLOR]);
    expect(tintApi.calls).toContainEqual([KNIGHT_B.token, undefined]);
  });

  it("tints legal targets of a clash die (bash/light/heavy) as a base-contact pair", () => {
    const dice: RoundSessionDie[] = [{ id: "a-d1", playerId: "a", face: 4 }];
    const targets: LegalTarget[] = [{ knightId: "a1", legal: true }];
    const session = fakeSession({
      remainingDice: () => dice,
      legalTargetsFor: () => targets,
    });
    const tintApi = fakeTintApi();

    applyHighlights({ session, knights: KNIGHTS, selectedDieId: "a-d1", tintApi });

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, CONTACT_TINT_COLOR]);
  });

  it("clears every tint when no die is selected", () => {
    const session = fakeSession();
    const tintApi = fakeTintApi();

    applyHighlights({ session, knights: KNIGHTS, selectedDieId: undefined, tintApi });

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, undefined]);
    expect(tintApi.calls).toContainEqual([KNIGHT_B.token, undefined]);
  });

  it("clears every tint when the session throws for the selected die (e.g. round ended)", () => {
    const session = fakeSession({
      legalTargetsFor: () => {
        throw new Error("unknown die");
      },
    });
    const tintApi = fakeTintApi();

    applyHighlights({ session, knights: KNIGHTS, selectedDieId: "gone", tintApi });

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, undefined]);
    expect(tintApi.calls).toContainEqual([KNIGHT_B.token, undefined]);
  });

  it("skips highlighting, logs one debug line, and never throws when the tint API is unavailable", () => {
    const session = fakeSession({
      legalTargetsFor: () => [{ knightId: "a1", legal: true }],
    });
    const log = vi.fn();

    expect(() =>
      applyHighlights({ session, knights: KNIGHTS, selectedDieId: "a-d1", tintApi: undefined, log })
    ).not.toThrow();

    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe("clearHighlights", () => {
  it("clears every knight's tint", () => {
    const tintApi = fakeTintApi();

    clearHighlights(KNIGHTS, tintApi);

    expect(tintApi.calls).toEqual([
      [KNIGHT_A.token, undefined],
      [KNIGHT_B.token, undefined],
    ]);
  });

  it("is a no-op when the tint API is unavailable", () => {
    expect(() => clearHighlights(KNIGHTS, undefined)).not.toThrow();
  });
});

describe("resolveTintApi", () => {
  it("returns undefined when there is no canvas (the API-absent path)", () => {
    vi.stubGlobal("canvas", undefined);

    expect(resolveTintApi()).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it("returns a working tint API when a mesh-tint-shaped canvas is present", () => {
    const placeable = { mesh: { tint: 0xffffff }, refresh: vi.fn() };
    vi.stubGlobal("canvas", { tokens: { placeables: [placeable] } });

    const api = resolveTintApi();
    expect(api).toBeDefined();

    api?.setTint(placeable, 0x123456);
    expect(placeable.mesh.tint).toBe(0x123456);
    expect(placeable.refresh).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

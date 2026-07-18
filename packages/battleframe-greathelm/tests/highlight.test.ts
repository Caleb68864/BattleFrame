import { describe, expect, it, vi } from "vitest";
import {
  applyHighlights,
  clearHighlights,
  createHighlightController,
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

describe("createHighlightController", () => {
  it("applies highlights for the given selection", () => {
    const dice: RoundSessionDie[] = [{ id: "a-d1", playerId: "a", face: 6 }];
    const targets: LegalTarget[] = [{ knightId: "a1", legal: true }];
    const session = fakeSession({
      remainingDice: () => dice,
      legalTargetsFor: () => targets,
    });
    const tintApi = fakeTintApi();
    const controller = createHighlightController({ session, knights: KNIGHTS, tintApi });

    controller.update("a-d1");

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, LEGAL_TINT_COLOR]);
  });

  it("clears highlights when the die is deselected", () => {
    const session = fakeSession();
    const tintApi = fakeTintApi();
    const controller = createHighlightController({ session, knights: KNIGHTS, tintApi });

    controller.update(undefined);

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, undefined]);
    expect(tintApi.calls).toContainEqual([KNIGHT_B.token, undefined]);
  });

  it("clears highlights instead of applying them once the round has completed", () => {
    const targets: LegalTarget[] = [{ knightId: "a1", legal: true }];
    const session = fakeSession({
      legalTargetsFor: () => targets,
      isComplete: () => true,
    });
    const tintApi = fakeTintApi();
    const controller = createHighlightController({ session, knights: KNIGHTS, tintApi });

    controller.update("a-d1");

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, undefined]);
    expect(tintApi.calls).not.toContainEqual([KNIGHT_A.token, LEGAL_TINT_COLOR]);
  });

  it("clears highlights on close, e.g. when the panel closes", () => {
    const session = fakeSession();
    const tintApi = fakeTintApi();
    const controller = createHighlightController({ session, knights: KNIGHTS, tintApi });

    controller.close();

    expect(tintApi.calls).toContainEqual([KNIGHT_A.token, undefined]);
    expect(tintApi.calls).toContainEqual([KNIGHT_B.token, undefined]);
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
    // This line used to assert `refresh` HAD been called -- it encoded the bug
    // as a requirement. Live on v14.363 that refresh is exactly what wipes the
    // tint one tick later, so the correct assertion is the opposite.
    expect(placeable.refresh).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe("resolveTintApi does not refresh the token it just tinted", () => {
  // Live on v14.363: refresh() recomputes mesh.tint from document.texture.tint
  // (#ffffff -- we never write the document), so a setTint that ends in
  // refresh() destroys its own write ~1 tick later. Measured: write-alone holds,
  // write-then-refresh reads back #ffffff after 800ms. See the vault note.
  function fakeToken() {
    return { mesh: { tint: 0xffffff }, refresh: vi.fn() };
  }

  it("writes mesh.tint and never calls refresh()", () => {
    vi.stubGlobal("canvas", { tokens: { placeables: [] } });
    const api = resolveTintApi()!;
    const token = fakeToken();

    api.setTint(token, 0x33cc66);

    expect(token.mesh.tint).toBe(0x33cc66);
    expect(token.refresh).not.toHaveBeenCalled();
  });

  it("clearing writes white and still never calls refresh()", () => {
    vi.stubGlobal("canvas", { tokens: { placeables: [] } });
    const api = resolveTintApi()!;
    const token = fakeToken();

    api.setTint(token, 0x33cc66);
    api.setTint(token, undefined);

    expect(token.mesh.tint).toBe(0xffffff);
    expect(token.refresh).not.toHaveBeenCalled();
  });

  it("a token with no mesh is left alone rather than throwing", () => {
    vi.stubGlobal("canvas", { tokens: { placeables: [] } });
    const api = resolveTintApi()!;

    expect(() => api.setTint({}, 0x33cc66)).not.toThrow();
    expect(() => api.setTint(undefined, 0x33cc66)).not.toThrow();
  });
});

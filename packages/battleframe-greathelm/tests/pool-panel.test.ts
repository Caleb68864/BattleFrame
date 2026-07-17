import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDieViewModels,
  buildKnightViewModels,
  createPoolPanelClass,
  type PoolPanelKnight,
} from "../src/ui/pool-panel";
import type { LegalTarget, RoundSession, RoundSessionDie } from "../src/round/session";
import langEn from "../lang/en.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof value === "object" && value !== null
      ? flattenKeys(value as Record<string, unknown>, path)
      : [path];
  });
}

const LANG_KEYS = new Set(flattenKeys(langEn));

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("i18n coverage", () => {
  it("has every key this sub-spec's files reference", () => {
    const referencedKeys = [
      "battleframe-greathelm.actions.sprint",
      "battleframe-greathelm.actions.encircle",
      "battleframe-greathelm.actions.bash",
      "battleframe-greathelm.actions.shift",
      "battleframe-greathelm.actions.light",
      "battleframe-greathelm.actions.heavy",
      "battleframe-greathelm.poolPanel.title",
      "battleframe-greathelm.poolPanel.readOnlyNotice",
      "battleframe-greathelm.poolPanel.reloadWarning",
      "battleframe-greathelm.poolPanel.noSelection",
      "battleframe-greathelm.poolPanel.reasons.knightRemoved",
      "battleframe-greathelm.poolPanel.reasons.noEnemyInContact",
    ];

    for (const key of referencedKeys) {
      expect(LANG_KEYS.has(key)).toBe(true);
    }
  });
});

describe("buildDieViewModels", () => {
  it("shows every unspent die from both sides, with face and action", () => {
    const dice: RoundSessionDie[] = [
      { id: "a-d1", playerId: "a", face: 6 },
      { id: "b-d1", playerId: "b", face: 5 },
    ];
    const session = fakeSession({
      remainingDice: () => dice,
      activePlayerId: () => "a",
    });

    const views = buildDieViewModels(session, undefined);

    expect(views).toHaveLength(2);
    expect(views[0]).toMatchObject({
      id: "a-d1",
      playerId: "a",
      face: 6,
      actionKey: "battleframe-greathelm.actions.sprint",
      selected: false,
    });
    expect(views[1]).toMatchObject({
      id: "b-d1",
      playerId: "b",
      face: 5,
      actionKey: "battleframe-greathelm.actions.encircle",
    });
  });

  it("marks only the active player's highest-face die offerable -- 6->1 is a global rule", () => {
    const dice: RoundSessionDie[] = [
      { id: "a-d1", playerId: "a", face: 4 },
      { id: "b-d1", playerId: "b", face: 6 },
    ];
    const session = fakeSession({
      remainingDice: () => dice,
      activePlayerId: () => "b",
    });

    const views = buildDieViewModels(session, undefined);
    const byId = new Map(views.map((view) => [view.id, view]));

    expect(byId.get("b-d1")?.offerable).toBe(true);
    expect(byId.get("a-d1")?.offerable).toBe(false);
  });

  it("marks the selected die", () => {
    const dice: RoundSessionDie[] = [{ id: "a-d1", playerId: "a", face: 6 }];
    const session = fakeSession({ remainingDice: () => dice, activePlayerId: () => "a" });

    const views = buildDieViewModels(session, "a-d1");

    expect(views[0].selected).toBe(true);
  });
});

describe("buildKnightViewModels", () => {
  const knights: PoolPanelKnight[] = [
    { id: "k1", playerId: "a", name: "Sir Roland" },
    { id: "k2", playerId: "a", name: "Sir Bors" },
  ];

  it("maps the session's legal targets straight through, with reason keys for illegal ones", () => {
    const targets: LegalTarget[] = [
      { knightId: "k1", legal: true },
      { knightId: "k2", legal: false, reason: "no-enemy-in-base-contact" },
    ];
    const legalTargetsFor = vi.fn(() => targets);
    const session = fakeSession({ legalTargetsFor });

    const views = buildKnightViewModels(session, knights, "a-d1");

    expect(legalTargetsFor).toHaveBeenCalledWith("a-d1");
    expect(views).toEqual([
      { id: "k1", name: "Sir Roland", legal: true, reasonKey: undefined },
      {
        id: "k2",
        name: "Sir Bors",
        legal: false,
        reasonKey: "battleframe-greathelm.poolPanel.reasons.noEnemyInContact",
      },
    ]);
  });

  it("maps every IllegalTargetReason to a literal, present lang key", () => {
    const reasons: LegalTarget["reason"][] = ["knight-removed", "no-enemy-in-base-contact"];

    for (const reason of reasons) {
      const session = fakeSession({
        legalTargetsFor: () => [{ knightId: "k1", legal: false, reason }],
      });

      const [view] = buildKnightViewModels(session, knights, "a-d1");

      expect(view.reasonKey).toBeDefined();
      expect(LANG_KEYS.has(view.reasonKey as string)).toBe(true);
    }
  });

  it("re-derives legality on every call -- never caches", () => {
    let call = 0;
    const legalTargetsFor = vi.fn((): LegalTarget[] => {
      call += 1;

      return [{ knightId: "k1", legal: call === 1 }];
    });
    const session = fakeSession({ legalTargetsFor });

    const first = buildKnightViewModels(session, knights, "a-d1");
    const second = buildKnightViewModels(session, knights, "a-d1");

    expect(first[0].legal).toBe(true);
    expect(second[0].legal).toBe(false);
    expect(legalTargetsFor).toHaveBeenCalledTimes(2);
  });
});

/** A minimal ApplicationV2-shaped base, standing in for foundry.applications.api.ApplicationV2. */
class FakeApplicationV2Base {
  options: Record<string, unknown>;
  element = { querySelectorAll: () => [] };

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
  }

  async render(): Promise<this> {
    return this;
  }
}

function fakeMixin(base: typeof FakeApplicationV2Base): typeof FakeApplicationV2Base {
  return base;
}

describe("createPoolPanelClass", () => {
  it("is built from ApplicationV2 + HandlebarsApplicationMixin, per the vault note", () => {
    const PanelClass = createPoolPanelClass(
      FakeApplicationV2Base as unknown as new (...args: any[]) => any,
      fakeMixin as unknown as (base: any) => any
    );

    expect((PanelClass as unknown as { PARTS: unknown }).PARTS).toEqual({
      form: { template: "modules/battleframe-greathelm/templates/pool-panel.hbs" },
    });
  });

  it("PoolPanel.canUserAccess() is true only for a GM user", () => {
    const PanelClass = createPoolPanelClass(
      FakeApplicationV2Base as unknown as new (...args: any[]) => any,
      fakeMixin as unknown as (base: any) => any
    ) as unknown as { canUserAccess: () => boolean };

    vi.stubGlobal("game", { user: { isGM: true } });
    expect(PanelClass.canUserAccess()).toBe(true);

    vi.stubGlobal("game", { user: { isGM: false } });
    expect(PanelClass.canUserAccess()).toBe(false);

    vi.stubGlobal("game", { user: undefined });
    expect(PanelClass.canUserAccess()).toBe(false);
  });

  it("GM: selecting a die then a knight spends the die through the session, then clears selection", async () => {
    vi.stubGlobal("game", { user: { isGM: true } });

    const dice: RoundSessionDie[] = [{ id: "a-d1", playerId: "a", face: 6 }];
    const spendDie = vi.fn(async () => undefined);
    const session = fakeSession({
      remainingDice: () => dice,
      activePlayerId: () => "a",
      legalTargetsFor: () => [{ knightId: "k1", legal: true }],
      spendDie,
    });
    const knights: PoolPanelKnight[] = [{ id: "k1", playerId: "a", name: "Sir Roland" }];

    const PanelClass = createPoolPanelClass(
      FakeApplicationV2Base as unknown as new (...args: any[]) => any,
      fakeMixin as unknown as (base: any) => any
    ) as unknown as new (options: { session: RoundSession; knights: PoolPanelKnight[] }) => {
      selectDie: (dieId: string) => void;
      spendOnKnight: (knightId: string) => Promise<void>;
      selectedDieId: string | undefined;
      _prepareContext: (options: unknown) => Promise<Record<string, unknown>>;
    };

    const panel = new PanelClass({ session, knights });

    panel.selectDie("a-d1");
    expect(panel.selectedDieId).toBe("a-d1");

    let context = await panel._prepareContext({});
    expect(context.canAccess).toBe(true);
    expect(context.knights).toEqual([{ id: "k1", name: "Sir Roland", legal: true, reasonKey: undefined }]);

    await panel.spendOnKnight("k1");

    expect(spendDie).toHaveBeenCalledWith("a-d1", "k1");
    expect(panel.selectedDieId).toBeUndefined();

    context = await panel._prepareContext({});
    expect(context.knights).toEqual([]);
  });

  it("clicking a selected die again deselects it", async () => {
    vi.stubGlobal("game", { user: { isGM: true } });

    const session = fakeSession({
      remainingDice: () => [{ id: "a-d1", playerId: "a", face: 6 }],
      activePlayerId: () => "a",
    });
    const PanelClass = createPoolPanelClass(
      FakeApplicationV2Base as unknown as new (...args: any[]) => any,
      fakeMixin as unknown as (base: any) => any
    ) as unknown as new (options: { session: RoundSession; knights: PoolPanelKnight[] }) => {
      selectDie: (dieId: string) => void;
      selectedDieId: string | undefined;
    };

    const panel = new PanelClass({ session, knights: [] });

    panel.selectDie("a-d1");
    expect(panel.selectedDieId).toBe("a-d1");

    panel.selectDie("a-d1");
    expect(panel.selectedDieId).toBeUndefined();
  });

  it("non-GM: context reports canAccess=false and spendOnKnight is a no-op", async () => {
    vi.stubGlobal("game", { user: { isGM: false } });

    const spendDie = vi.fn(async () => undefined);
    const session = fakeSession({
      remainingDice: () => [{ id: "a-d1", playerId: "a", face: 6 }],
      activePlayerId: () => "a",
      legalTargetsFor: () => [{ knightId: "k1", legal: true }],
      spendDie,
    });
    const knights: PoolPanelKnight[] = [{ id: "k1", playerId: "a", name: "Sir Roland" }];

    const PanelClass = createPoolPanelClass(
      FakeApplicationV2Base as unknown as new (...args: any[]) => any,
      fakeMixin as unknown as (base: any) => any
    ) as unknown as new (options: { session: RoundSession; knights: PoolPanelKnight[] }) => {
      selectDie: (dieId: string) => void;
      spendOnKnight: (knightId: string) => Promise<void>;
      _prepareContext: (options: unknown) => Promise<Record<string, unknown>>;
    };

    const panel = new PanelClass({ session, knights });
    panel.selectDie("a-d1");

    const context = await panel._prepareContext({});
    expect(context.canAccess).toBe(false);

    await panel.spendOnKnight("k1");
    expect(spendDie).not.toHaveBeenCalled();
  });
});

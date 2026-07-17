import { beforeAll, describe, expect, it, vi } from "vitest";
import { SYSTEM_ID } from "./constants";
import {
  SETTING_ACTIVE_RULESET_ID,
  SETTING_DEFAULT_GRID_UNIT,
  SETTING_MENU_SETUP_WIZARD,
  SETTING_SETUP_COMPLETED,
} from "./settings";
import { GENERIC_ACTOR_TYPE } from "./data/generic-actor";

describe("battleframe constants", () => {
  it("declares the system id", () => {
    expect(SYSTEM_ID).toBe("battleframe");
  });
});

interface RegisteredSheet {
  scope: string;
  options?: Record<string, unknown>;
}

/**
 * The entry point is only exercised through Foundry's `init`/`ready` hooks,
 * so the wiring test stands up the smallest fake Foundry that every core
 * module resolves against, imports the entry point, then fires the hooks in
 * the order Foundry would. Everything below asserts on observable global
 * state -- the same state a ruleset module reads.
 */
function installFakeFoundry(): {
  hooks: Map<string, Array<() => void>>;
  settings: Map<string, Record<string, unknown>>;
  menus: Map<string, Record<string, unknown>>;
  sheets: RegisteredSheet[];
} {
  const hooks = new Map<string, Array<() => void>>();
  const settings = new Map<string, Record<string, unknown>>();
  const menus = new Map<string, Record<string, unknown>>();
  const sheets: RegisteredSheet[] = [];
  const values = new Map<string, unknown>();

  const globalScope = globalThis as unknown as Record<string, unknown>;

  globalScope.Hooks = {
    once: (name: string, callback: () => void) => {
      const existing = hooks.get(name) ?? [];
      existing.push(callback);
      hooks.set(name, existing);
    },
    on: () => {},
    callAll: () => {},
  };

  globalScope.game = {
    settings: {
      register: (_ns: string, key: string, data: Record<string, unknown>) => {
        settings.set(key, data);
        values.set(key, data.default);
      },
      registerMenu: (_ns: string, key: string, data: Record<string, unknown>) => {
        menus.set(key, data);
      },
      get: (_ns: string, key: string) => values.get(key),
      set: async (_ns: string, key: string, value: unknown) => {
        values.set(key, value);
        return value;
      },
    },
    // A non-GM keeps the `ready` wizard from auto-opening; wizard-open
    // behaviour is setup-wizard's own test, not the entry point's.
    user: { isGM: false },
    actors: { contents: [], invalidDocumentIds: { values: () => [][Symbol.iterator]() } },
    modules: [],
  };

  class FakeApplicationV2 {}
  class FakeCombat {}
  class FakeCombatTracker {}
  class FakeActor {}
  class FakeTypeDataModel {}
  class FakeStringField {}
  class FakeHTMLField {}

  globalScope.Combat = FakeCombat;
  globalScope.CONFIG = { Actor: { documentClass: FakeActor } };

  globalScope.foundry = {
    abstract: { TypeDataModel: FakeTypeDataModel },
    data: { fields: { StringField: FakeStringField, HTMLField: FakeHTMLField } },
    applications: {
      api: {
        ApplicationV2: FakeApplicationV2,
        HandlebarsApplicationMixin: (base: unknown) => base,
      },
      sheets: { ActorSheetV2: FakeApplicationV2 },
      sidebar: { tabs: { CombatTracker: FakeCombatTracker } },
      apps: {
        DocumentSheetConfig: {
          registerSheet: (
            _documentClass: unknown,
            scope: string,
            _sheetClass: unknown,
            options?: Record<string, unknown>
          ) => {
            sheets.push({ scope, options });
          },
        },
      },
    },
  };

  return { hooks, settings, menus, sheets };
}

describe("battleframe entry point", () => {
  let env: ReturnType<typeof installFakeFoundry>;

  beforeAll(async () => {
    env = installFakeFoundry();

    // Imported after the fake globals exist: several core modules register
    // their hooks at module scope and would throw on a bare Node global.
    vi.resetModules();
    await import("./battleframe");

    for (const callback of env.hooks.get("init") ?? []) {
      callback();
    }
    for (const callback of env.hooks.get("ready") ?? []) {
      callback();
    }
  });

  it("registers init and ready hooks", () => {
    expect((env.hooks.get("init") ?? []).length).toBeGreaterThan(0);
    expect((env.hooks.get("ready") ?? []).length).toBeGreaterThan(0);
  });

  it("installs the battleframe api on the game namespace", () => {
    const namespace = (globalThis as unknown as { game: { battleframe?: Record<string, unknown> } })
      .game.battleframe;

    expect(namespace?.api).toBeDefined();
    expect(typeof (namespace?.api as { registerRuleset?: unknown }).registerRuleset).toBe(
      "function"
    );
    expect(typeof (namespace?.api as { activateRuleset?: unknown }).activateRuleset).toBe(
      "function"
    );
  });

  it("installs the measurement and dice apis alongside the api", () => {
    const namespace = (globalThis as unknown as { game: { battleframe?: Record<string, unknown> } })
      .game.battleframe;

    // All three share one namespace object -- an installer that clobbers
    // rather than spreads would drop a sibling here.
    expect(typeof (namespace?.measure as { between?: unknown })?.between).toBe("function");
    expect(typeof (namespace?.dice as { roll?: unknown })?.roll).toBe("function");
    expect(namespace?.api).toBeDefined();
  });

  it("registers every setup setting plus the wizard menu", () => {
    expect(env.settings.has(SETTING_ACTIVE_RULESET_ID)).toBe(true);
    expect(env.settings.has(SETTING_SETUP_COMPLETED)).toBe(true);
    expect(env.settings.has(SETTING_DEFAULT_GRID_UNIT)).toBe(true);

    // The menu only registers when the entry point passes the wizard class
    // through -- its absence is the regression this asserts against.
    expect(env.menus.has(SETTING_MENU_SETUP_WIZARD)).toBe(true);
    expect(env.menus.get(SETTING_MENU_SETUP_WIZARD)?.type).toBeTypeOf("function");
  });

  it("sets the battleframe Combat document class", () => {
    const config = (globalThis as unknown as {
      CONFIG: { Combat?: { documentClass?: new () => unknown } };
    }).CONFIG;

    expect(config.Combat?.documentClass).toBeTypeOf("function");

    // Battleframe has no initiative model: the subclass must neuter it.
    const instance = new (config.Combat!.documentClass as new () => {
      setInitiative: () => Promise<void>;
      getBattleframeOrder: () => string[];
    })();
    expect(instance.setInitiative()).toBeInstanceOf(Promise);
    expect(typeof instance.getBattleframeOrder).toBe("function");
  });

  it("registers the battleframe combat tracker as the combat ui", () => {
    const config = (globalThis as unknown as { CONFIG: { ui?: { combat?: unknown } } }).CONFIG;

    expect(config.ui?.combat).toBeTypeOf("function");
  });

  it("registers the generic actor data model", () => {
    const config = (globalThis as unknown as {
      CONFIG: { Actor?: { dataModels?: Record<string, unknown> } };
    }).CONFIG;

    expect(config.Actor?.dataModels?.[GENERIC_ACTOR_TYPE]).toBeTypeOf("function");
  });

  it("registers the generic actor sheet as the default for generic actors", () => {
    const registered = env.sheets.find((sheet) => sheet.scope === SYSTEM_ID);

    expect(registered).toBeDefined();
    expect(registered?.options?.types).toEqual([GENERIC_ACTOR_TYPE]);
    expect(registered?.options?.makeDefault).toBe(true);
  });

  it("exposes a registry that a ruleset module can register into at init", () => {
    // The end-to-end reason the namespace has to exist before module init.
    const api = (globalThis as unknown as {
      game: { battleframe: { api: { registerRuleset: (def: unknown) => { ok: boolean } } } };
    }).game.battleframe.api;

    const result = api.registerRuleset({
      id: "test-ruleset",
      title: "Test Ruleset",
      version: "1.0.0",
      primary: true,
      battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
    });

    expect(result.ok).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  buildOrphanConversionUpdate,
  convertOrphanToGeneric,
  extractPackageId,
  findOrphanedActors,
  warnAboutOrphans,
  type ActorLike,
  type ModuleLike,
} from "../src/rulesets/orphan-check";
import { getSchemaVersion, setSchemaVersion } from "../src/documents/actor";

function actor(overrides: Partial<ActorLike> = {}): ActorLike {
  return {
    id: "actor-1",
    name: "Test Actor",
    type: "generic",
    system: {},
    ...overrides,
  };
}

function module(overrides: Partial<ModuleLike> = {}): ModuleLike {
  return {
    id: "some-module",
    active: true,
    ...overrides,
  };
}

describe("extractPackageId", () => {
  it("extracts the module id from a namespaced type", () => {
    expect(extractPackageId("my-ruleset.trooper")).toBe("my-ruleset");
  });

  it("returns null for un-namespaced core types", () => {
    expect(extractPackageId("generic")).toBeNull();
  });

  it("returns null for a type starting with a dot", () => {
    expect(extractPackageId(".weird")).toBeNull();
  });
});

describe("findOrphanedActors", () => {
  it("finds no orphans when every actor's module is active", () => {
    const actors = [
      actor({ id: "a1", type: "ruleset-a.trooper" }),
      actor({ id: "a2", type: "generic" }),
    ];
    const modules = [module({ id: "ruleset-a", active: true })];

    expect(findOrphanedActors(actors, modules)).toEqual([]);
  });

  it("finds exactly one orphan when its module is disabled", () => {
    const actors = [
      actor({ id: "a1", type: "ruleset-a.trooper" }),
      actor({ id: "a2", type: "generic" }),
    ];
    const modules = [module({ id: "ruleset-a", active: false })];

    const orphans = findOrphanedActors(actors, modules);

    expect(orphans).toHaveLength(1);
    expect(orphans[0]).toMatchObject({
      packageId: "ruleset-a",
      type: "ruleset-a.trooper",
    });
    expect(orphans[0].actor.id).toBe("a1");
  });

  it("finds orphans from two different disabled modules", () => {
    const actors = [
      actor({ id: "a1", type: "ruleset-a.trooper" }),
      actor({ id: "a2", type: "ruleset-b.squad" }),
      actor({ id: "a3", type: "ruleset-c.unit" }),
    ];
    const modules = [
      module({ id: "ruleset-a", active: false }),
      module({ id: "ruleset-b", active: false }),
      module({ id: "ruleset-c", active: true }),
    ];

    const orphans = findOrphanedActors(actors, modules);

    expect(orphans).toHaveLength(2);
    const packageIds = orphans.map((o) => o.packageId).sort();
    expect(packageIds).toEqual(["ruleset-a", "ruleset-b"]);
  });

  it("treats a module absent from the modules collection as disabled", () => {
    const actors = [actor({ id: "a1", type: "uninstalled-ruleset.trooper" })];

    const orphans = findOrphanedActors(actors, []);

    expect(orphans).toHaveLength(1);
    expect(orphans[0].packageId).toBe("uninstalled-ruleset");
  });
});

describe("warnAboutOrphans", () => {
  it("does not warn when there are no orphans", () => {
    const warn = vi.fn();
    warnAboutOrphans([], { warn });
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once per disabled module, naming the module and the count", () => {
    const warn = vi.fn();
    const orphans = findOrphanedActors(
      [
        actor({ id: "a1", type: "ruleset-a.trooper" }),
        actor({ id: "a2", type: "ruleset-a.squad" }),
        actor({ id: "a3", type: "ruleset-b.unit" }),
      ],
      [
        module({ id: "ruleset-a", active: false }),
        module({ id: "ruleset-b", active: false }),
      ]
    );

    warnAboutOrphans(orphans, { warn });

    expect(warn).toHaveBeenCalledTimes(2);
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages.some((m) => m.includes("ruleset-a") && m.includes("2"))).toBe(true);
    expect(messages.some((m) => m.includes("ruleset-b") && m.includes("1"))).toBe(true);
  });
});

describe("buildOrphanConversionUpdate / convertOrphanToGeneric", () => {
  it("preserves the original system payload under flags.battleframe.orphanedFrom", () => {
    const originalSystem = { quality: 4, models: 5 };
    const orphans = findOrphanedActors(
      [actor({ id: "a1", type: "ruleset-a.trooper", system: originalSystem })],
      [module({ id: "ruleset-a", active: false })]
    );

    const update = buildOrphanConversionUpdate(orphans[0]);

    expect(update.type).toBe("generic");
    expect(update.flags).toEqual({
      battleframe: {
        orphanedFrom: {
          packageId: "ruleset-a",
          type: "ruleset-a.trooper",
          system: originalSystem,
        },
      },
    });
  });

  it("never converts automatically -- only applies when explicitly invoked", async () => {
    const orphans = findOrphanedActors(
      [actor({ id: "a1", type: "ruleset-a.trooper" })],
      [module({ id: "ruleset-a", active: false })]
    );

    const update = vi.fn().mockResolvedValue(undefined);
    const doc = { ...orphans[0].actor, update };

    // findOrphanedActors / buildOrphanConversionUpdate alone must not call update.
    expect(update).not.toHaveBeenCalled();

    await convertOrphanToGeneric(doc, orphans[0]);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ type: "generic" })
    );
  });
});

describe("getSchemaVersion / setSchemaVersion", () => {
  it("treats a document with no flag as unversioned", () => {
    const doc = { flags: {} };
    expect(getSchemaVersion(doc)).toBeNull();
  });

  it("reads a stamped version via getFlag", () => {
    const doc = {
      getFlag: (scope: string, key: string) =>
        scope === "battleframe" && key === "schemaVersion" ? 3 : undefined,
    };
    expect(getSchemaVersion(doc)).toBe(3);
  });

  it("stamps a version via setFlag when available", async () => {
    const setFlag = vi.fn().mockResolvedValue(undefined);
    const doc = { setFlag };

    await setSchemaVersion(doc, 2);

    expect(setFlag).toHaveBeenCalledWith("battleframe", "schemaVersion", 2);
  });

  it("stamps a version directly on flags when setFlag is unavailable", async () => {
    const doc: { flags?: Record<string, Record<string, unknown> | undefined> } = {};

    await setSchemaVersion(doc, 5);

    expect(getSchemaVersion(doc)).toBe(5);
  });
});

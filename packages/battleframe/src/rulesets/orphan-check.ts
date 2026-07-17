import { SYSTEM_ID } from "../constants";
import { GENERIC_ACTOR_TYPE } from "../data/generic-actor";

/**
 * Minimal shape battleframe needs from an Actor document to detect and
 * convert orphans. Foundry v13+ namespaces module-provided Actor
 * subtypes as `"<moduleId>.<subtype>"` -- that's the only signal we have
 * for "which package owns this type", so it's the one this module relies
 * on. Core types (no dot, e.g. `"generic"`) are never orphans.
 */
export interface ActorLike {
  id?: string;
  name?: string;
  type: string;
  system?: unknown;
  flags?: Record<string, Record<string, unknown> | undefined>;
}

export interface ModuleLike {
  id: string;
  active: boolean;
}

export interface OrphanedActorInfo {
  actor: ActorLike;
  packageId: string;
  type: string;
}

/**
 * Extracts the owning module/package id from a namespaced Actor type
 * (`"moduleId.subtype"` -> `"moduleId"`). Un-namespaced types (core's own
 * `"generic"`, or anything with no dot) return `null` -- they cannot be
 * orphaned, since no module owns them.
 */
export function extractPackageId(actorType: string): string | null {
  const dotIndex = actorType.indexOf(".");

  if (dotIndex <= 0) {
    return null;
  }

  return actorType.slice(0, dotIndex);
}

/**
 * Finds every Actor whose type belongs to a module that is not currently
 * active. A module absent from the `modules` collection entirely (e.g.
 * uninstalled, not merely disabled) is treated the same as disabled --
 * either way, its type definition is not available to render or validate
 * against.
 *
 * Whether orphaned documents remain reachable via the normal Actor
 * collection or only via `invalidDocumentIds` was unconfirmed research
 * (see SS-08 decisions) -- callers are expected to pass both sources in
 * via `actors`, e.g. `[...game.actors, ...game.actors.invalidDocumentIds.values()]`,
 * so this function stays correct either way.
 */
export function findOrphanedActors(
  actors: Iterable<ActorLike>,
  modules: Iterable<ModuleLike>
): OrphanedActorInfo[] {
  const moduleById = new Map<string, ModuleLike>();
  for (const module of modules) {
    moduleById.set(module.id, module);
  }

  const orphans: OrphanedActorInfo[] = [];

  for (const actor of actors) {
    const packageId = extractPackageId(actor.type);

    if (!packageId) {
      continue;
    }

    const module = moduleById.get(packageId);
    const isDisabled = !module || module.active === false;

    if (isDisabled) {
      orphans.push({ actor, packageId, type: actor.type });
    }
  }

  return orphans;
}

export interface OrphanNotifier {
  warn: (message: string) => void;
}

function resolveNotifier(): OrphanNotifier {
  const globalScope = globalThis as unknown as {
    ui?: { notifications?: { warn?: (message: string) => void } };
  };

  const uiWarn = globalScope.ui?.notifications?.warn;

  if (typeof uiWarn === "function") {
    return { warn: (message) => uiWarn(message) };
  }

  return { warn: (message) => console.warn(message) };
}

/**
 * Warns the GM loudly about every orphaned Actor, grouped and counted per
 * disabled module by name. This never converts or drops anything on its
 * own -- it only surfaces the problem so the GM can decide.
 */
export function warnAboutOrphans(
  orphans: readonly OrphanedActorInfo[],
  notifier: OrphanNotifier = resolveNotifier()
): void {
  if (orphans.length === 0) {
    return;
  }

  const countByPackage = new Map<string, number>();

  for (const orphan of orphans) {
    countByPackage.set(
      orphan.packageId,
      (countByPackage.get(orphan.packageId) ?? 0) + 1
    );
  }

  for (const [packageId, count] of countByPackage) {
    notifier.warn(
      `${SYSTEM_ID} | ${count} Actor(s) belong to disabled module "${packageId}" ` +
        "and are now orphaned. Their data is safe but they will not render " +
        "correctly until you re-enable the module, or convert them to the " +
        "generic Actor type."
    );
  }
}

/**
 * Builds the update payload that converts a single orphaned Actor to the
 * generic type, preserving the original `system` payload and package/type
 * under `flags.battleframe.orphanedFrom` so the conversion is reversible
 * and nothing is destroyed.
 *
 * This function only builds the update -- it never applies it. Actual
 * conversion happens only when the GM explicitly confirms; no orphan is
 * ever auto-converted.
 */
export function buildOrphanConversionUpdate(
  orphan: OrphanedActorInfo
): Record<string, unknown> {
  return {
    type: GENERIC_ACTOR_TYPE,
    system: {},
    flags: {
      [SYSTEM_ID]: {
        orphanedFrom: {
          packageId: orphan.packageId,
          type: orphan.type,
          system: orphan.actor.system,
        },
      },
    },
  };
}

export interface UpdatableActor extends ActorLike {
  update?: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Applies the conversion built by `buildOrphanConversionUpdate` to a
 * single Actor. Callers must only invoke this after explicit GM
 * confirmation -- it performs no confirmation of its own.
 */
export async function convertOrphanToGeneric(
  actor: UpdatableActor,
  orphan: OrphanedActorInfo
): Promise<void> {
  const update = buildOrphanConversionUpdate(orphan);

  if (typeof actor.update === "function") {
    await actor.update(update);
  }
}

function collectAllActors(): ActorLike[] {
  const globalScope = globalThis as unknown as {
    game?: {
      actors?: {
        contents?: ActorLike[];
        invalidDocumentIds?: { values?: () => IterableIterator<ActorLike> };
      } & Iterable<ActorLike>;
      modules?: Iterable<ModuleLike>;
    };
  };

  const actorsCollection = globalScope.game?.actors;

  if (!actorsCollection) {
    return [];
  }

  const known = Array.from(
    actorsCollection.contents ?? Array.from(actorsCollection as Iterable<ActorLike>)
  );

  const invalid = actorsCollection.invalidDocumentIds?.values
    ? Array.from(actorsCollection.invalidDocumentIds.values())
    : [];

  return [...known, ...invalid];
}

function collectAllModules(): ModuleLike[] {
  const globalScope = globalThis as unknown as {
    game?: { modules?: Iterable<ModuleLike> };
  };

  return Array.from(globalScope.game?.modules ?? []);
}

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

/**
 * Runs the orphan check at `ready` and warns the GM. Registration is
 * idempotent and detection-only -- see `warnAboutOrphans` and
 * `convertOrphanToGeneric` for the (separate, GM-gated) conversion path.
 */
export function registerOrphanCheck(): void {
  const orphans = findOrphanedActors(collectAllActors(), collectAllModules());
  warnAboutOrphans(orphans);
}

if (hooksAvailable()) {
  Hooks.once("ready", () => {
    registerOrphanCheck();
  });
}

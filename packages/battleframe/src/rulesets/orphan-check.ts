import { SYSTEM_ID } from "../constants";
import { GENERIC_ACTOR_TYPE } from "../data/generic-actor";
// Also registers the `preCreateActor` schema-version stamp at module
// scope. This module is on the entry point's side-effect import chain;
// ../documents/actor is not imported anywhere else in production code,
// so this import is what puts the stamping hook in the shipped bundle.
import { CORE_SCHEMA_VERSION } from "../documents/actor";

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
 *
 * A non-string `actorType` also returns `null`. This is not defensive
 * paranoia: an Actor whose module is disabled FAILS validation and initializes
 * with `type === undefined`, and the orphan check exists precisely to run over
 * those Actors -- so it must survive the very state it is built to handle.
 * Found live: disabling a ruleset module left its Actors with no type, and
 * `undefined.indexOf(".")` crashed the whole `ready` hook.
 */
export function extractPackageId(actorType: string): string | null {
  if (typeof actorType !== "string") {
    return null;
  }

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
        // The converted Actor is a `generic` -- core's own type, authored
        // here by core -- so core stamps its own schema version on it.
        // The ruleset's original version, if it had one, is irrelevant to
        // the generic schema and is preserved inside `orphanedFrom`.
        schemaVersion: CORE_SCHEMA_VERSION,
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

/**
 * The confirmation an orphan conversion needs before it may touch
 * anything. Injectable so the GM-decides rule is assertable in tests
 * without a live Foundry.
 */
export interface OrphanConversionPrompt {
  confirm: (message: string) => Promise<boolean>;
}

/**
 * Resolves a confirmation dialog from whatever the running Foundry
 * actually offers, or `null` if it offers nothing recognisable.
 *
 * `foundry.applications.api.DialogV2` is the expected v14 home for this,
 * but **its exact shape is unverified** -- vault/foundry-systems/ has no
 * note on DialogV2 at any confidence level, and this project's rules say
 * confirmed research beats recollection. So every candidate is
 * feature-detected and called inside a try/catch rather than asserted.
 *
 * When nothing resolves, the caller degrades to warn-only: the GM keeps
 * the warning and loses only the one-click path, which is strictly better
 * than converting against an API shape nobody has checked. Nothing here
 * ever converts on its own.
 */
function resolveConversionPrompt(): OrphanConversionPrompt | null {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        api?: {
          DialogV2?: { confirm?: (options: Record<string, unknown>) => Promise<unknown> };
        };
      };
    };
    Dialog?: { confirm?: (options: Record<string, unknown>) => Promise<unknown> };
  };

  const dialogV2Confirm = globalScope.foundry?.applications?.api?.DialogV2?.confirm;

  if (typeof dialogV2Confirm === "function") {
    return {
      confirm: async (message) => {
        try {
          const answer = await dialogV2Confirm({
            window: { title: "battleframe.orphans.convertTitle" },
            content: `<p>${message}</p>`,
            modal: true,
          });
          return answer === true;
        } catch (error) {
          console.warn(`${SYSTEM_ID} | orphan conversion dialog failed`, error);
          return false;
        }
      },
    };
  }

  const dialogV1Confirm = globalScope.Dialog?.confirm;

  if (typeof dialogV1Confirm === "function") {
    return {
      confirm: async (message) => {
        try {
          const answer = await dialogV1Confirm({ content: `<p>${message}</p>` });
          return answer === true;
        } catch (error) {
          console.warn(`${SYSTEM_ID} | orphan conversion dialog failed`, error);
          return false;
        }
      },
    };
  }

  return null;
}

/**
 * Offers the GM conversion to the generic type, one decision per disabled
 * module, and converts only the groups the GM explicitly accepts. Declining
 * leaves the Actors exactly as they were -- an orphan is never dropped and
 * never converted without a yes.
 *
 * Returns the number of Actors converted, so callers and tests can tell
 * "GM said no" from "there was nothing to ask about".
 */
export async function offerOrphanConversion(
  orphans: readonly OrphanedActorInfo[],
  prompt: OrphanConversionPrompt | null = resolveConversionPrompt()
): Promise<number> {
  if (orphans.length === 0 || !prompt) {
    return 0;
  }

  const byPackage = new Map<string, OrphanedActorInfo[]>();

  for (const orphan of orphans) {
    const group = byPackage.get(orphan.packageId) ?? [];
    group.push(orphan);
    byPackage.set(orphan.packageId, group);
  }

  let converted = 0;

  for (const [packageId, group] of byPackage) {
    const accepted = await prompt.confirm(
      `Convert ${group.length} orphaned Actor(s) from disabled module ` +
        `"${packageId}" to the generic type? Their original data is kept ` +
        `under flags.${SYSTEM_ID}.orphanedFrom, so this is reversible.`
    );

    if (!accepted) {
      continue;
    }

    for (const orphan of group) {
      await convertOrphanToGeneric(orphan.actor as UpdatableActor, orphan);
      converted += 1;
    }
  }

  return converted;
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
 * Whether the current user is a GM. Same gate as `shouldAutoOpenWizard`
 * in applications/setup-wizard.ts, for the same reason: only a GM can act
 * on ruleset trouble, so only a GM should be told about it.
 */
function isCurrentUserGM(): boolean {
  const globalScope = globalThis as unknown as {
    game?: { user?: { isGM?: boolean } };
  };

  return globalScope.game?.user?.isGM === true;
}

/**
 * Runs the orphan check at `ready`: warns the GM loudly, then offers
 * conversion to the generic type. Both are **GM-only** -- a player can do
 * nothing about a disabled module, so warning them just makes a working
 * world look broken.
 *
 * Nothing is auto-converted. The warning always fires; the conversion
 * offer fires only if a dialog API resolved, and only converts what the
 * GM confirms.
 */
export async function registerOrphanCheck(): Promise<void> {
  if (!isCurrentUserGM()) {
    return;
  }

  const orphans = findOrphanedActors(collectAllActors(), collectAllModules());

  if (orphans.length === 0) {
    return;
  }

  warnAboutOrphans(orphans);
  await offerOrphanConversion(orphans);
}

if (hooksAvailable()) {
  Hooks.once("ready", () => {
    void registerOrphanCheck();
  });
}

import { SYSTEM_ID } from "../constants";
import { GENERIC_ACTOR_TYPE } from "../data/generic-actor";

/**
 * The schema version core stamps on the documents core itself authors.
 * This is core's own number and describes core's own `generic` schema --
 * it says nothing about any ruleset's schema, and must never be applied
 * to one. Bump it when `GenericActorData`'s schema changes shape.
 */
export const CORE_SCHEMA_VERSION = 1;

/**
 * Minimal shape battleframe needs from a Foundry document to read/write
 * its own flags namespace. Deliberately loose -- real Actor/Item/Scene
 * documents all satisfy this without a cast.
 */
export interface FlaggableDocument {
  getFlag?: (scope: string, key: string) => unknown;
  setFlag?: (scope: string, key: string, value: unknown) => Promise<unknown>;
  flags?: {
    [scope: string]: Record<string, unknown> | undefined;
  };
}

/**
 * Reads `flags.battleframe.schemaVersion` off a document. A document with
 * no flag is unversioned -- this returns `null`, never a guessed current
 * version, so callers cannot mistake "never stamped" for "up to date".
 */
export function getSchemaVersion(doc: FlaggableDocument): number | null {
  if (typeof doc.getFlag === "function") {
    const value = doc.getFlag(SYSTEM_ID, "schemaVersion");
    return typeof value === "number" ? value : null;
  }

  const value = doc.flags?.[SYSTEM_ID]?.schemaVersion;
  return typeof value === "number" ? value : null;
}

/**
 * Stamps `flags.battleframe.schemaVersion` on a document. Core only calls
 * this for documents core itself creates (the generic actor type) -- it
 * has no business stamping a ruleset's documents, since that would
 * require knowing the ruleset's own versioning scheme. Rulesets call this
 * same helper for their own documents.
 */
export async function setSchemaVersion(
  doc: FlaggableDocument,
  version: number
): Promise<void> {
  if (typeof doc.setFlag === "function") {
    await doc.setFlag(SYSTEM_ID, "schemaVersion", version);
    return;
  }

  doc.flags = doc.flags ?? {};
  doc.flags[SYSTEM_ID] = { ...(doc.flags[SYSTEM_ID] ?? {}), schemaVersion: version };
}

/**
 * Shape `preCreateActor` hands us. At `preCreate` the document is not
 * persisted yet, so `setFlag` is the wrong tool -- the source data is
 * amended in place via `updateSource` and saved as part of the create.
 */
export interface PreCreateActorDocument extends FlaggableDocument {
  type?: string;
  updateSource?: (changes: Record<string, unknown>) => unknown;
}

/**
 * Stamps `flags.battleframe.schemaVersion` on Actors **core itself
 * creates** -- which means the `generic` type and nothing else. A
 * ruleset's Actor is stamped by that ruleset, using this module's
 * exported `setSchemaVersion`; core stamping it would mean core knowing
 * the ruleset's versioning scheme, which is exactly the neutrality break
 * the design forbids.
 *
 * An already-stamped document is left alone: a duplicated or imported
 * Actor carries a real version and overwriting it with the current one
 * would silently claim a migration that never ran.
 *
 * Returns whether it stamped, so the behaviour is assertable without a
 * live Foundry.
 */
export function stampCoreSchemaVersionOnCreate(
  doc: PreCreateActorDocument,
  version: number = CORE_SCHEMA_VERSION
): boolean {
  if (doc.type !== GENERIC_ACTOR_TYPE) {
    return false;
  }

  if (getSchemaVersion(doc) !== null) {
    return false;
  }

  if (typeof doc.updateSource === "function") {
    doc.updateSource({ [`flags.${SYSTEM_ID}.schemaVersion`]: version });
    return true;
  }

  doc.flags = doc.flags ?? {};
  doc.flags[SYSTEM_ID] = { ...(doc.flags[SYSTEM_ID] ?? {}), schemaVersion: version };
  return true;
}

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

/**
 * Registers the `preCreateActor` listener that stamps core's schema
 * version. `Hooks.on`, not `once` -- every generic Actor created over the
 * world's lifetime needs stamping, not just the first.
 */
export function registerSchemaVersionStamping(): void {
  // Hooks.on's declared listener is `(...args: unknown[]) => void`, so the
  // narrow parameter has to be asserted at the boundary rather than declared.
  // Caught by `tsc --noEmit`, NOT by `npm run build` -- vite strips types
  // without checking them, so a green build is not a type gate.
  Hooks.on("preCreateActor", (...args: unknown[]) => {
    stampCoreSchemaVersionOnCreate(args[0] as PreCreateActorDocument);
  });
}

if (hooksAvailable()) {
  registerSchemaVersionStamping();
}

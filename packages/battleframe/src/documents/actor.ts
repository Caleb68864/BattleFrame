import { SYSTEM_ID } from "../constants";

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

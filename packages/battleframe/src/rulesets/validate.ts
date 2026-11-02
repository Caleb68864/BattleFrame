import type { RulesetDefinition } from "./types";

/**
 * Foundry's own version comparison. Absent only with no Foundry at all (a unit
 * test), where there is no running system to be incompatible with.
 */
function isNewerVersion(candidate: string, baseline: string): boolean {
  const utils = (globalThis as unknown as {
    foundry?: { utils?: { isNewerVersion?: (a: string, b: string) => boolean } };
  }).foundry?.utils;

  return utils?.isNewerVersion?.(candidate, baseline) ?? false;
}

export function validateRulesetDefinition(
  def: RulesetDefinition,
  existingIds: readonly string[],
  runningVersion: string
): string[] {
  const errors: string[] = [];

  if (!def || typeof def !== "object") {
    return ["Ruleset definition must be an object."];
  }

  if (!def.id || typeof def.id !== "string") {
    errors.push("Ruleset definition requires a non-empty string \"id\".");
  } else if (existingIds.includes(def.id)) {
    errors.push(`Ruleset id "${def.id}" is already registered. Choose a unique id.`);
  }

  if (!def.title || typeof def.title !== "string") {
    errors.push("Ruleset definition requires a non-empty string \"title\".");
  }

  if (!def.version || typeof def.version !== "string") {
    errors.push("Ruleset definition requires a non-empty string \"version\".");
  }

  if (!def.battleframeCompatibility || typeof def.battleframeCompatibility !== "object") {
    errors.push("Ruleset definition requires a \"battleframeCompatibility\" object.");
  } else {
    const { minimum, verified } = def.battleframeCompatibility;

    if (!minimum || typeof minimum !== "string") {
      errors.push("battleframeCompatibility.minimum must be a non-empty string.");
    } else if (isNewerVersion(minimum, runningVersion)) {
      errors.push(
        `Ruleset "${def.id}" requires battleframe >= ${minimum}, but the running system is ${runningVersion}.`
      );
    }

    if (!verified || typeof verified !== "string") {
      errors.push("battleframeCompatibility.verified must be a non-empty string.");
    }
  }

  if (typeof def.primary !== "boolean") {
    errors.push("Ruleset definition requires a boolean \"primary\".");
  }

  return errors;
}

import type { RulesetDefinition } from "./types";

function parseVersionParts(version: string): number[] {
  return version
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));
}

export function compareVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const aPart = aParts[i] ?? 0;
    const bPart = bParts[i] ?? 0;
    if (aPart !== bPart) {
      return aPart - bPart;
    }
  }

  return 0;
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
    } else if (compareVersions(minimum, runningVersion) > 0) {
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

/**
 * A6 — the Stage-2 chit-draw resolver (build plan §2). The whole damage rules
 * body, PURE, over an injected list of drawn chit codes. This is where the TDD
 * lives; the live RollTable draw that produces the codes is thin glue (G5),
 * verified in a live world.
 *
 * Neutrality: the module owns the chit-code GRAMMAR + parser below. Everything
 * else — the pot composition, what each colour means, the per-weapon×band×armour
 * `validity` list, and the infantry kill totals — is USER-entered. No GZG data.
 */

export type SpecialToken = "MOB" | "SYS" | "BOOM";

const SPECIAL_TOKENS: readonly SpecialToken[] = ["MOB", "SYS", "BOOM"];

export type ParsedChit =
  | { kind: "numeric"; colour: string; value: number }
  | { kind: "special"; token: SpecialToken }
  | { kind: "unknown"; code: string };

const NUMERIC_CHIT = /^([A-Za-z]+)(\d+)$/;

/**
 * Parses one chit code. `"<COLOUR><VALUE>"` (letters then digits, e.g. `R3`,
 * `green2`) is a numeric chit; the reserved tokens `MOB`/`SYS`/`BOOM` are
 * specials; anything else is `unknown` (counted as drawn, contributes nothing).
 */
export function parseChit(code: string): ParsedChit {
  if ((SPECIAL_TOKENS as readonly string[]).includes(code)) {
    return { kind: "special", token: code as SpecialToken };
  }
  const match = NUMERIC_CHIT.exec(code);
  if (match) {
    return { kind: "numeric", colour: match[1], value: Number(match[2]) };
  }
  return { kind: "unknown", code };
}

export interface ChitContext {
  /** Valid COLOUR tokens for this weapon × band × armour type (USER table). */
  validity: string[];
  band: "close" | "medium" | "long";
  /** DFFG scales value: ×2 close, halve (floor) long. */
  isDffg: boolean;
  /** Armour value of the struck face (A7). */
  faceArmour: number;
  target: "vehicle" | "infantry";
  /** Infantry only: the per-troop-type stand-removal threshold (USER). */
  killTotal?: number;
}

export type ChitOutcome = "none" | "damaged" | "knocked-out" | "stand-removed";

export interface ChitResult {
  outcome: ChitOutcome;
  specials: SpecialToken[];
}

/** Case-insensitive colour-validity membership. Both sides are user tokens. */
function isValidColour(colour: string, validity: readonly string[]): boolean {
  const lower = colour.toLowerCase();
  return validity.some((c) => c.toLowerCase() === lower);
}

/** DFFG value scaling: ×2 close, halve (floor) long, unchanged medium. */
function scaleDffg(value: number, band: ChitContext["band"]): number {
  if (band === "close") {
    return value * 2;
  }
  if (band === "long") {
    return Math.floor(value / 2);
  }
  return value;
}

/**
 * Resolves a drawn set of chits (length = weapon class) against the target.
 *
 * 1. Parse each code.
 * 2. Invalid-colour numeric chits count as drawn but contribute 0 (no redraw).
 * 3. Specials apply to VEHICLES only; ignored vs infantry.
 * 4. DFFG scales each valid value before summing.
 * 5. Sum valid numeric values.
 * 6. Vehicle: `< faceArmour → none`, `= → damaged`, `> → knocked-out`.
 *    Infantry: `sum >= killTotal → stand-removed`, else `none`.
 */
export function resolveChitDraw(drawn: readonly string[], ctx: ChitContext): ChitResult {
  let sum = 0;
  const specials: SpecialToken[] = [];

  for (const code of drawn) {
    const chit = parseChit(code);
    if (chit.kind === "special") {
      if (ctx.target === "vehicle") {
        specials.push(chit.token);
      }
      continue;
    }
    if (chit.kind === "numeric" && isValidColour(chit.colour, ctx.validity)) {
      sum += scaleDffg(chit.value, ctx.band);
    }
    // invalid-colour numeric + unknown: counted as drawn, contribute 0.
  }

  if (ctx.target === "infantry") {
    const threshold = ctx.killTotal ?? Infinity;
    return { outcome: sum >= threshold ? "stand-removed" : "none", specials: [] };
  }

  let outcome: ChitOutcome;
  if (sum < ctx.faceArmour) {
    outcome = "none";
  } else if (sum === ctx.faceArmour) {
    outcome = "damaged";
  } else {
    outcome = "knocked-out";
  }
  return { outcome, specials };
}

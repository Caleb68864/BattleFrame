import { bandStep, type Bands } from "../combat/band";
import { firerDie, targetDie, resolveHit, type FireControl } from "../combat/tohit";
import { armourByFace, type ArmourValue, type StruckFace } from "../combat/armour";
import { resolveChitDraw, type ChitResult } from "../combat/chit";
import type { DieType } from "../dice/ladder";

/**
 * G6 — the Stage-1/Stage-2 fire path, composed over INJECTED dice + drawChits so
 * the whole sequence is unit-testable Foundry-free. The live wiring (measure ->
 * distance, RollTable -> drawChits) is thin glue (G5, round-control.ts); the pure
 * `resolveChitDraw` stays untouched underneath.
 *
 * Sequence: bandStep -> firerDie/targetDie via dice.roll -> resolveHit -> on hit,
 * drawChits(weapon.class) -> resolveChitDraw vs armourByFace(struck face).
 */

export type Band = "close" | "medium" | "long";

/** Maps the die-shift step to a band name (close +1 / medium 0 / long -1). */
export function stepToBand(step: number): Band {
  if (step > 0) return "close";
  if (step < 0) return "long";
  return "medium";
}

export interface DiceLike {
  roll(
    formula: string,
    data?: Record<string, unknown>,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<{ total: number }>;
}

export interface FireDeps {
  dice: DiceLike;
  /** Draws `n` chit codes without replacement from the pot (G5 glue). */
  drawChits: (n: number) => Promise<string[]>;
}

export interface FireInput {
  distance: number;
  firer: { fireControl: FireControl; movedOverHalf: boolean };
  weapon: {
    class: number;
    bands: Bands;
    isDffg: boolean;
    isArtyOrSlam: boolean;
    /** USER validity lists keyed by band. */
    chitValidity: Partial<Record<Band, string[]>>;
  };
  target: {
    effSignature: number;
    postureSecondaries: readonly DieType[];
    sigTable: Readonly<Record<number, DieType>>;
    armour: ArmourValue;
    struckFace: StruckFace;
    kind: "vehicle" | "infantry";
    killTotal?: number;
  };
}

export interface FireResult {
  outOfRange: boolean;
  autoMiss: boolean;
  band?: Band;
  firerFace?: number;
  targetFaces?: number[];
  hit: boolean;
  drawn?: string[];
  chit?: ChitResult;
}

const MODULE_FLAVOR = "battleframe-dirtside-ii";

export async function resolveFire(input: FireInput, deps: FireDeps): Promise<FireResult> {
  const { weapon, target, firer } = input;

  const step = bandStep(input.distance, weapon.bands);
  if (step === null) {
    return { outOfRange: true, autoMiss: false, hit: false };
  }
  const band = stepToBand(step);

  const fDie = firerDie(firer.fireControl, step, firer.movedOverHalf);
  if (fDie === null) {
    // Shifts fell off the bottom of the ladder — DSII reads that as auto-miss.
    return { outOfRange: false, autoMiss: true, band, hit: false };
  }

  const firerFace = (await deps.dice.roll(`1${fDie}`, {}, { rulesetId: MODULE_FLAVOR, flavor: "fire (firer)" })).total;

  const tDie = targetDie(target.effSignature, target.postureSecondaries, target.sigTable);
  const targetFaces: number[] = [];
  if (tDie) {
    targetFaces.push(
      (await deps.dice.roll(`1${tDie}`, {}, { rulesetId: MODULE_FLAVOR, flavor: "fire (target)" })).total
    );
  }

  const hit = resolveHit(firerFace, targetFaces);
  if (!hit) {
    return { outOfRange: false, autoMiss: false, band, firerFace, targetFaces, hit: false };
  }

  const drawn = await deps.drawChits(weapon.class);
  const faceArmour = armourByFace(target.armour, target.struckFace, weapon.isArtyOrSlam);
  const chit = resolveChitDraw(drawn, {
    validity: weapon.chitValidity[band] ?? [],
    band,
    isDffg: weapon.isDffg,
    faceArmour,
    target: target.kind,
    killTotal: target.killTotal,
  });

  return { outOfRange: false, autoMiss: false, band, firerFace, targetFaces, hit: true, drawn, chit };
}

/* ---- Chat report (G7) — pure card content, names escaped ---------------- */

export const FIRE_REPORT_CLASS = "dirtside-ii-fire-report";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface FireReportNames {
  firer: string;
  target: string;
}

export interface FireReportParts {
  title: string;
  lines: string[];
  cssClass: string;
}

/**
 * Builds the chat-card title + body for one fire resolution. Dynamic names are
 * escaped; static markup is safe. The single source of truth for the card the
 * live flow posts through `chat.postCard`.
 */
export function fireReportParts(result: FireResult, names: FireReportNames): FireReportParts {
  const firer = escapeHtml(names.firer);
  const target = escapeHtml(names.target);
  const title = `${firer} &rarr; ${target}`;
  const lines: string[] = [];

  if (result.outOfRange) {
    lines.push(`<p>Out of range.</p>`);
    return { title, lines, cssClass: FIRE_REPORT_CLASS };
  }
  if (result.autoMiss) {
    lines.push(`<p>No effective die at this range &mdash; <strong>auto-miss.</strong></p>`);
    return { title, lines, cssClass: FIRE_REPORT_CLASS };
  }

  const roll = `${result.firerFace} vs ${(result.targetFaces ?? []).join("/") || "—"}`;
  if (!result.hit) {
    lines.push(`<p>${band(result)} &middot; ${roll} &mdash; <strong>miss.</strong></p>`);
    return { title, lines, cssClass: FIRE_REPORT_CLASS };
  }

  lines.push(`<p>${band(result)} &middot; ${roll} &mdash; <strong>hit.</strong></p>`);
  const chit = result.chit;
  if (chit) {
    lines.push(
      `<p>Chits [${(result.drawn ?? []).join(", ")}] &rarr; <strong>${chit.outcome}</strong>.</p>`
    );
    if (chit.specials.length > 0) {
      lines.push(`<p class="ds2-specials">Specials: ${chit.specials.join(", ")}.</p>`);
    }
  }
  return { title, lines, cssClass: FIRE_REPORT_CLASS };
}

function band(result: FireResult): string {
  return result.band ? result.band.charAt(0).toUpperCase() + result.band.slice(1) : "";
}

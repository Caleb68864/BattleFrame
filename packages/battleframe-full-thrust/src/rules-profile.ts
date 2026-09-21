import { MODULE_ID, SETTING_RULES_PROFILE } from "./constants";

/**
 * The numbers this module used to ship, as a profile the user fills in.
 *
 * Full Thrust's rules numbers lived in `constants.ts` until the rules-content
 * audit (`docs/rules-content-audit.md`): 147 constants covering the per-die
 * damage table, the FT2 threshold table, pulse-torpedo and K-gun to-hit tables
 * by range band, every weapon range, and the ship-design caps -- plus, in the
 * comments, runs of the rulebook quoted verbatim and a points value.
 *
 * Ground Zero Games publishes Full Thrust free, which is why it was worth
 * asking whether this could be imported from the PDF instead of typed. It
 * cannot, and that was measured rather than assumed: the FT2 rulebook is a
 * 50-page scan (Creator "Acrobat 5.0 Image Conversion Plug-in", fifty
 * characters of extractable text in the whole document, every page one 150 DPI
 * JPEG2000 image). OCR of grayscale numeric tables at that resolution fails
 * silently and in the worst available way -- a 6 read as an 8 is not a crash,
 * it is a wrong rule that plays correctly forever. So the import path is a file
 * the user writes, and any future PDF assist pre-fills it for confirmation
 * rather than writing values.
 *
 * Free to download is also not free to redistribute, which is the other half of
 * why these numbers are not in the repository.
 *
 * Ships {@link BLANK_PROFILE}. Nothing here has a working default, on purpose:
 * see {@link requireRules}.
 */

/**
 * Every Full Thrust number, as the world supplies it.
 *
 * One flat record rather than nested groups. The field names are the old
 * constant names in camelCase, so a reader can follow any value back to the
 * code that used to hold it, and so the migration was mechanical rather than a
 * 110-way judgement call about taxonomy.
 */
export interface RulesProfile {
  arcDegrees: number;
  attackFighterDogfightKillOn: number;
  beamRangeBandMu: number;
  carrierLaunchPerTurn: number;
  coreSystemThresholdBonus: number;
  courses: number;
  coursePointDegrees: number;
  dieOneDamageMax: number;
  dieOneDamageMin: number;
  dieSize: number;
  dieTwoDamage: number;
  fightersPerBay: number;
  fighterAttackRangeMu: number;
  fighterGroupMax: number;
  fighterMoveFastMu: number;
  fighterMoveMu: number;
  fighterRecoverPerTurn: number;
  fighterReturnGraceTurns: number;
  kgunArmourPierceDp: number;
  kgunBandMu: number;
  kgunDamageMultiplier: number;
  kgunK1PointDefenceKillOn: number;
  kgunMaxRangeMu: number;
  kgunToHitByBand: readonly number[];
  manoeuvringThrusterDivisor: number;
  maxScreenLevel: number;
  maxThrust: number;
  missileAttackRangeMu: number;
  missileEmpNoEffectMax: number;
  missileEmpStrongKillOn: number;
  missileEmpWarheadDice: number;
  missileEmpWeakKillOn: number;
  missileEmpWeakMax: number;
  missileLifeTurns: number;
  missileMoveMu: number;
  missileNeedleKnockoutMin: number;
  missileNeedleWarheadDice: number;
  missileNormalWarheadDice: number;
  missileRearArc: string;
  missileTurnPoints: number;
  mkpHitDp: number;
  mkpOneHitMin: number;
  mkpTwoHit: number;
  needleKillOn: number;
  needleMaxRangeMu: number;
  novaCannonArmingOffsetMu: number;
  novaCannonDiceByTurn: readonly number[];
  novaCannonLifeTurns: number;
  novaCannonTemplateInchesByTurn: readonly number[];
  novaCannonTravelMuByTurn: readonly number[];
  pdsFighterOneKillMin: number;
  pdsFighterTwoKill: number;
  pdsMissileKillOn: number;
  pilotAceExtraAttackDice: number;
  pilotAceInitiativeModifier: number;
  pilotAceMoraleModifier: number;
  pilotQualityAceRoll: number;
  pilotQualityTurkeyRoll: number;
  pilotStandardMoraleBreakFails: number;
  pilotTurkeyDogfightDieModifier: number;
  pilotTurkeyInitiativeModifier: number;
  pilotTurkeyMoraleBreakFails: number;
  pilotTurkeyMoraleModifier: number;
  plasmaBoltInterceptOneReduceMin: number;
  plasmaBoltInterceptTwoReduce: number;
  plasmaBoltPdsReduceOn: number;
  plasmaBoltScreenMaxLevel: number;
  pushMuPerPoint: number;
  rotationThrusterCost: number;
  salvoRangeMu: number;
  salvoSize: number;
  savaskuDamagedDriveMultiplier: number;
  savaskuDroneBiomassPer: number;
  savaskuDronePowerPer: number;
  savaskuLancePodBandMu: number;
  savaskuLancePodMaxRangeMu: number;
  savaskuLancePodToHitByBand: readonly number[];
  savaskuLeechClearMax: number;
  savaskuLeechClearMin: number;
  savaskuLeechPodImpactDp: number;
  savaskuRepairSuccessMin: number;
  savaskuScreenNodeMassPercent: number;
  savaskuScreenNodeMinMass: number;
  savaskuStingerBandMu: number;
  savaskuStingerMaxRangeMu: number;
  savaskuStingerPowerPerDieByBand: readonly number[];
  savaskuThrustCostPercent: number;
  scattergunFriendlyFireOn: number;
  scattergunHeavyFighterDivisor: number;
  scattergunPlasmaOneReduceMin: number;
  scattergunPlasmaTwoReduce: number;
  scattergunShipOneDpMin: number;
  scattergunShipTwoDp: number;
  shipLaunchPerTurn: number;
  submunitionBandMu: number;
  submunitionDiceByBand: readonly number[];
  submunitionMaxRangeMu: number;
  thresholdKillOn: readonly number[];
  torpedoBandMu: number;
  torpedoHitMin: number;
  torpedoMaxRangeMu: number;
  torpedoToHitByBand: readonly number[];
  variableHullGradePercent: Readonly<Record<string, number>>;
  variableHullPointsPerMass: number;
  variableHullRows: number;
  waveGunBandMu: number;
  waveGunDiceByBand: readonly number[];
  waveGunFullCharge: number;
  waveGunMaxRangeMu: number;
  waveGunTemplateInchesByBand: readonly number[];
}

/**
 * The profile as shipped: every number zero, every table empty.
 *
 * Deliberately not playable. A profile that arrived half-filled with the
 * published values would make the strip cosmetic -- the numbers would live at
 * this line instead of in `constants.ts` -- and it would be invisible, because
 * a module that works out of the box is exactly what nobody investigates.
 */
export const BLANK_PROFILE: RulesProfile = Object.freeze({
  arcDegrees: 0,
  attackFighterDogfightKillOn: 0,
  beamRangeBandMu: 0,
  carrierLaunchPerTurn: 0,
  coreSystemThresholdBonus: 0,
  courses: 0,
  coursePointDegrees: 0,
  dieOneDamageMax: 0,
  dieOneDamageMin: 0,
  dieSize: 0,
  dieTwoDamage: 0,
  fightersPerBay: 0,
  fighterAttackRangeMu: 0,
  fighterGroupMax: 0,
  fighterMoveFastMu: 0,
  fighterMoveMu: 0,
  fighterRecoverPerTurn: 0,
  fighterReturnGraceTurns: 0,
  kgunArmourPierceDp: 0,
  kgunBandMu: 0,
  kgunDamageMultiplier: 0,
  kgunK1PointDefenceKillOn: 0,
  kgunMaxRangeMu: 0,
  kgunToHitByBand: [],
  manoeuvringThrusterDivisor: 0,
  maxScreenLevel: 0,
  maxThrust: 0,
  missileAttackRangeMu: 0,
  missileEmpNoEffectMax: 0,
  missileEmpStrongKillOn: 0,
  missileEmpWarheadDice: 0,
  missileEmpWeakKillOn: 0,
  missileEmpWeakMax: 0,
  missileLifeTurns: 0,
  missileMoveMu: 0,
  missileNeedleKnockoutMin: 0,
  missileNeedleWarheadDice: 0,
  missileNormalWarheadDice: 0,
  missileRearArc: "",
  missileTurnPoints: 0,
  mkpHitDp: 0,
  mkpOneHitMin: 0,
  mkpTwoHit: 0,
  needleKillOn: 0,
  needleMaxRangeMu: 0,
  novaCannonArmingOffsetMu: 0,
  novaCannonDiceByTurn: [],
  novaCannonLifeTurns: 0,
  novaCannonTemplateInchesByTurn: [],
  novaCannonTravelMuByTurn: [],
  pdsFighterOneKillMin: 0,
  pdsFighterTwoKill: 0,
  pdsMissileKillOn: 0,
  pilotAceExtraAttackDice: 0,
  pilotAceInitiativeModifier: 0,
  pilotAceMoraleModifier: 0,
  pilotQualityAceRoll: 0,
  pilotQualityTurkeyRoll: 0,
  pilotStandardMoraleBreakFails: 0,
  pilotTurkeyDogfightDieModifier: 0,
  pilotTurkeyInitiativeModifier: 0,
  pilotTurkeyMoraleBreakFails: 0,
  pilotTurkeyMoraleModifier: 0,
  plasmaBoltInterceptOneReduceMin: 0,
  plasmaBoltInterceptTwoReduce: 0,
  plasmaBoltPdsReduceOn: 0,
  plasmaBoltScreenMaxLevel: 0,
  pushMuPerPoint: 0,
  rotationThrusterCost: 0,
  salvoRangeMu: 0,
  salvoSize: 0,
  savaskuDamagedDriveMultiplier: 0,
  savaskuDroneBiomassPer: 0,
  savaskuDronePowerPer: 0,
  savaskuLancePodBandMu: 0,
  savaskuLancePodMaxRangeMu: 0,
  savaskuLancePodToHitByBand: [],
  savaskuLeechClearMax: 0,
  savaskuLeechClearMin: 0,
  savaskuLeechPodImpactDp: 0,
  savaskuRepairSuccessMin: 0,
  savaskuScreenNodeMassPercent: 0,
  savaskuScreenNodeMinMass: 0,
  savaskuStingerBandMu: 0,
  savaskuStingerMaxRangeMu: 0,
  savaskuStingerPowerPerDieByBand: [],
  savaskuThrustCostPercent: 0,
  scattergunFriendlyFireOn: 0,
  scattergunHeavyFighterDivisor: 0,
  scattergunPlasmaOneReduceMin: 0,
  scattergunPlasmaTwoReduce: 0,
  scattergunShipOneDpMin: 0,
  scattergunShipTwoDp: 0,
  shipLaunchPerTurn: 0,
  submunitionBandMu: 0,
  submunitionDiceByBand: [],
  submunitionMaxRangeMu: 0,
  thresholdKillOn: [],
  torpedoBandMu: 0,
  torpedoHitMin: 0,
  torpedoMaxRangeMu: 0,
  torpedoToHitByBand: [],
  variableHullGradePercent: {},
  variableHullPointsPerMass: 0,
  variableHullRows: 0,
  waveGunBandMu: 0,
  waveGunDiceByBand: [],
  waveGunFullCharge: 0,
  waveGunMaxRangeMu: 0,
  waveGunTemplateInchesByBand: [],
}) as RulesProfile;

/** Raised when the module is asked to play in a world that has entered no numbers. */
export class RulesProfileNotSetError extends Error {
  constructor() {
    super(
      `${MODULE_ID} | this module ships no rules numbers, and this world has not ` +
        `entered them. Open the module settings and fill in the rules profile, ` +
        `or import one, using the rulebook you own.`
    );
    this.name = "RulesProfileNotSetError";
  }
}

/** Raised when an imported profile is not one. */
export class RulesProfileInvalidError extends Error {
  constructor(reason: string) {
    super(`${MODULE_ID} | that is not a rules profile: ${reason}`);
    this.name = "RulesProfileInvalidError";
  }
}

interface FoundrySettingsApi {
  register: (namespace: string, key: string, data: Record<string, unknown>) => void;
  get: (namespace: string, key: string) => unknown;
  set: (namespace: string, key: string, value: unknown) => Promise<unknown>;
}

function resolveSettings(): FoundrySettingsApi | undefined {
  const globalScope = globalThis as unknown as {
    game?: { settings?: FoundrySettingsApi };
  };
  return globalScope.game?.settings;
}

export function registerRulesProfileSetting(): void {
  const settings = resolveSettings();
  if (!settings) {
    return;
  }

  settings.register(MODULE_ID, SETTING_RULES_PROFILE, {
    name: `${MODULE_ID}.settings.rulesProfile.name`,
    hint: `${MODULE_ID}.settings.rulesProfile.hint`,
    scope: "world",
    config: false,
    type: Object,
    default: BLANK_PROFILE
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function wholeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Reads an arbitrary value as a profile, keeping only fields this module knows.
 *
 * Unknown keys are dropped rather than carried: the numbers are the user's, but
 * the field set is the module's, and a stored profile naming a field nothing
 * reads would look like a setting that works.
 */
export function normalizeRules(value: unknown): RulesProfile {
  if (!isPlainObject(value)) {
    return BLANK_PROFILE;
  }

  const out = {} as Record<string, unknown>;
  for (const [key, blank] of Object.entries(BLANK_PROFILE)) {
    const given = value[key];
    if (Array.isArray(blank)) {
      out[key] = Array.isArray(given) ? given.map(wholeNumber) : [];
    } else if (typeof blank === "number") {
      out[key] = wholeNumber(given);
    } else if (typeof blank === "string") {
      out[key] = typeof given === "string" ? given : "";
    } else {
      // the one record-valued field (hull grades)
      const record: Record<string, number> = {};
      if (isPlainObject(given)) {
        for (const [k, v] of Object.entries(given)) {
          record[k] = wholeNumber(v);
        }
      }
      out[key] = record;
    }
  }
  return out as unknown as RulesProfile;
}

/**
 * Memo for {@link getRules}, keyed by the identity of the stored value.
 *
 * Every read of a stripped number goes through `requireRules`, including inside
 * per-die loops, and normalising 110 fields on each of those would make the
 * strip cost measurable where the constants cost nothing. Foundry hands back
 * the same object until the setting is written, so identity is a sound key; a
 * write produces a new object and the memo misses exactly once.
 */
let memoRaw: unknown = Symbol("unset");
let memoProfile: RulesProfile = BLANK_PROFILE;

/** The world's profile, or {@link BLANK_PROFILE} where none has been entered. */
export function getRules(): RulesProfile {
  const settings = resolveSettings();
  if (!settings) {
    return BLANK_PROFILE;
  }

  const raw = settings.get(MODULE_ID, SETTING_RULES_PROFILE);
  if (raw !== memoRaw) {
    memoRaw = raw;
    memoProfile = normalizeRules(raw);
  }
  return memoProfile;
}

/** Drops the memo. For tests, which swap the world between cases. */
export function clearRulesCache(): void {
  memoRaw = Symbol("unset");
  memoProfile = BLANK_PROFILE;
}

/**
 * The fields that must be present for anything at all to resolve.
 *
 * Not the whole 110: a table playing the base game without the Savasku pods or
 * the Nova Cannon should not be forced to invent numbers for them. These are the
 * ones every other calculation runs through -- the die, the damage table, the
 * arc geometry -- so a profile missing them cannot play any Full Thrust at all.
 */
const REQUIRED_FIELDS: readonly (keyof RulesProfile)[] = [
  "dieSize",
  "dieOneDamageMin",
  "dieTwoDamage",
  "arcDegrees",
  "courses"
];

/** True when a profile carries the fields every other calculation runs through. */
export function isRulesComplete(profile: RulesProfile = getRules()): boolean {
  return REQUIRED_FIELDS.every((field) => (profile[field] as number) > 0);
}

/**
 * The world's rules, or a refusal.
 *
 * Every read of a stripped number goes through this. There is deliberately
 * nothing to fall back to: a default here would be the published number, one
 * indirection further from the file it was removed from.
 *
 * @throws {RulesProfileNotSetError} When the world has entered no profile.
 */
export function requireRules(): RulesProfile {
  const profile = getRules();
  if (!isRulesComplete(profile)) {
    throw new RulesProfileNotSetError();
  }
  return profile;
}

/**
 * Stores a profile, after reading it as one.
 *
 * This is the import path: hand it parsed JSON from a file the user wrote from
 * the rulebook they own.
 *
 * @throws {RulesProfileInvalidError} When the payload is not a profile, or
 *   carries none of the fields play runs through.
 */
export async function importRules(payload: unknown): Promise<RulesProfile> {
  if (!isPlainObject(payload)) {
    throw new RulesProfileInvalidError("it is not an object");
  }

  const profile = normalizeRules(payload);
  if (!isRulesComplete(profile)) {
    throw new RulesProfileInvalidError(
      `it leaves out ${REQUIRED_FIELDS.join(", ")}, which every other number is read against`
    );
  }

  const settings = resolveSettings();
  if (!settings) {
    throw new RulesProfileInvalidError("there is no world to store it in");
  }

  await settings.set(MODULE_ID, SETTING_RULES_PROFILE, profile);
  return profile;
}

/**
 * A blank profile written out as a file the user can fill in.
 *
 * Every field the importer reads is present and every value is empty, so the
 * template says what to supply without saying what to put.
 */
export function rulesTemplate(): string {
  return JSON.stringify(BLANK_PROFILE, null, 2);
}

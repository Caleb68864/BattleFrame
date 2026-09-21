import { MODULE_ID, SETTING_RULES_PROFILE } from "../../src/constants";
import {
  BLANK_PROFILE,
  clearRulesCache,
  type RulesProfile
} from "../../src/rules-profile";

/**
 * A world that has answered for its own rules numbers.
 *
 * This module ships none, so every test that resolves a shot, moves a missile
 * or checks a threshold has to supply them the way a user does. If this helper
 * defaulted to the published table, that table would live here instead of in
 * `constants.ts` and the strip would be cosmetic.
 *
 * {@link SCENARIO_RULES} is an **invented ruleset**. It keeps the *shape* the
 * suite's scenarios were written against -- six faces, six arcs, bands that
 * widen outward -- because these tests are about mechanics, not about where the
 * numbers came from, and re-deriving 644 scenarios would prove nothing extra.
 * Where a value is only ever compared against itself, it is deliberately not
 * the published one.
 */
export const SCENARIO_RULES: RulesProfile = {
  ...BLANK_PROFILE,

  // The die and the universal per-die damage table.
  dieSize: 6,
  dieMissMax: 3,
  dieOneDamageMin: 4,
  dieOneDamageMax: 5,
  dieTwoDamage: 6,

  // Geometry: six arcs of sixty degrees, twelve courses of thirty.
  arcDegrees: 60,
  courses: 12,
  coursePointDegrees: 30,

  // Ship design caps.
  maxThrust: 8,
  maxScreenLevel: 3,

  // Beams and the threshold ladder.
  beamRangeBandMu: 12,
  thresholdKillOn: [6, 5, 4],
  coreSystemThresholdBonus: 1,

  // Ordnance.
  salvoSize: 6,
  salvoRangeMu: 24,
  torpedoMaxRangeMu: 30,
  torpedoBandMu: 6,
  torpedoToHitByBand: [2, 3, 4, 5, 6],
  torpedoHitMin: 4,
  needleMaxRangeMu: 9,
  needleKillOn: 6,
  submunitionMaxRangeMu: 18,
  submunitionBandMu: 6,
  submunitionDiceByBand: [3, 2, 1],

  // Independent missiles.
  missileMoveMu: 18,
  missileTurnPoints: 2,
  missileLifeTurns: 3,
  missileAttackRangeMu: 6,
  missileRearArc: "A",
  missileNormalWarheadDice: 2,
  missileEmpWarheadDice: 1,
  missileEmpNoEffectMax: 2,
  missileEmpWeakMax: 4,
  missileEmpWeakKillOn: 5,
  missileEmpStrongKillOn: 4,
  missileNeedleWarheadDice: 1,
  missileNeedleKnockoutMin: 4,

  // Point defence.
  pdsRangeMu: 6,
  pdsFighterOneKillMin: 4,
  pdsFighterTwoKill: 6,
  pdsMissileKillOn: 6,

  // Fighters and carriers.
  fighterGroupMax: 6,
  fighterMoveMu: 12,
  fighterMoveFastMu: 18,
  fighterAttackRangeMu: 6,
  fightersPerBay: 6,
  carrierLaunchPerTurn: 2,
  shipLaunchPerTurn: 1,
  fighterRecoverPerTurn: 1,
  fighterReturnGraceTurns: 3,
  attackFighterDogfightKillOn: 6,

  // Pilot quality.
  pilotQualityAceRoll: 6,
  pilotQualityTurkeyRoll: 1,
  pilotAceExtraAttackDice: 1,
  pilotAceMoraleModifier: -1,
  pilotTurkeyMoraleModifier: 1,
  pilotTurkeyMoraleBreakFails: 2,
  pilotStandardMoraleBreakFails: 3,
  pilotTurkeyDogfightDieModifier: -1,
  pilotAceInitiativeModifier: 1,
  pilotTurkeyInitiativeModifier: -1,

  // Nova Cannon and Wave Gun.
  novaCannonLifeTurns: 3,
  novaCannonArmingOffsetMu: 6,
  novaCannonDiceByTurn: [6, 4, 2],
  novaCannonTemplateInchesByTurn: [2, 4, 6],
  novaCannonTravelMuByTurn: [18, 24, 24],
  waveGunMaxRangeMu: 36,
  waveGunBandMu: 12,
  waveGunDiceByBand: [4, 3, 2],
  waveGunTemplateInchesByBand: [2, 3, 4],
  waveGunFullCharge: 6,

  // Vector movement.
  manoeuvringThrusterDivisor: 2,
  pushMuPerPoint: 1,
  rotationThrusterCost: 1,

  // Variable hull.
  variableHullGradePercent: {
    fragile: 10,
    weak: 20,
    average: 30,
    strong: 40,
    super: 50
  },
  variableHullPointsPerMass: 2,
  variableHullRows: 4,

  // K-gun.
  kgunMaxRangeMu: 30,
  kgunBandMu: 6,
  kgunToHitByBand: [2, 3, 4, 5, 6],
  kgunDamageMultiplier: 2,
  kgunArmourPierceDp: 1,
  kgunK1PointDefenceKillOn: 5,

  // Phalon plasma and scattergun.
  plasmaBoltMaxRangeMu: 30,
  plasmaBoltBurstRadiusMu: 6,
  plasmaBoltInterceptRadiusMu: 6,
  plasmaBoltInterceptOneReduceMin: 4,
  plasmaBoltInterceptTwoReduce: 6,
  plasmaBoltPdsReduceOn: 6,
  plasmaBoltScreenMaxLevel: 2,
  scattergunRangeMu: 6,
  scattergunFriendlyFireOn: 1,
  scattergunHeavyFighterDivisor: 2,
  scattergunPlasmaOneReduceMin: 4,
  scattergunPlasmaTwoReduce: 6,
  scattergunShipOneDpMin: 4,
  scattergunShipTwoDp: 6,

  // Kra'Vak railguns.
  mkpRangeMu: 12,
  mkpHitDp: 4,
  mkpOneHitMin: 4,
  mkpTwoHit: 6,

  // Savasku.
  savaskuStingerMaxRangeMu: 72,
  savaskuStingerBandMu: 12,
  savaskuStingerPowerPerDieByBand: [1, 2, 4, 8, 16, 32],
  savaskuLancePodMaxRangeMu: 24,
  savaskuLancePodBandMu: 6,
  savaskuLancePodToHitByBand: [3, 4, 5, 6],
  savaskuInterceptorPodRangeMu: 12,
  savaskuLeechPodImpactDp: 2,
  savaskuLeechPodOngoingDp: 2,
  savaskuLeechClearMin: 1,
  savaskuLeechClearMax: 3,
  savaskuDronesPerGroup: 6,
  savaskuDroneMoveMu: 24,
  savaskuDroneDicePer: 1,
  savaskuDroneBiomassPer: 1,
  savaskuDronePowerPer: 1,
  savaskuRepairSuccessMin: 4,
  savaskuRepairBiomassOnSuccess: 1,
  savaskuScreenNodeMassPercent: 5,
  savaskuScreenNodeMinMass: 3,
  savaskuThrustCostPercent: 2,
  savaskuDamagedDriveMultiplier: 2,
  savaskuMaxEffectiveScreens: 2,
  savaskuBiomassMassPerBox: 1,
  savaskuBiomassPointsPerBox: 2,
  savaskuPodBiomassCost: 1,
  savaskuSpiculeCost: 1,
  savaskuInterceptorPodCost: 3,
  savaskuLancePodCost: 3,
  savaskuLancePodArmourPierceDp: 1,
  savaskuLeechPodCost: 3
};

interface SettingsStub {
  register: () => void;
  get: (namespace: string, key: string) => unknown;
  set: (namespace: string, key: string, value: unknown) => Promise<unknown>;
}

/**
 * Installs a `game.settings` stub carrying a rules profile, and returns the
 * teardown. Clears the profile memo on both ends, since it is keyed by the
 * identity of the stored object and tests swap worlds between cases.
 */
export function withRules(profile: RulesProfile = SCENARIO_RULES): () => void {
  const globalScope = globalThis as unknown as {
    game?: { settings?: SettingsStub } & Record<string, unknown>;
  };
  const previous = globalScope.game;
  let stored: unknown = profile;

  globalScope.game = {
    ...(previous ?? {}),
    settings: {
      register: () => {},
      get: (namespace: string, key: string) =>
        namespace === MODULE_ID && key === SETTING_RULES_PROFILE ? stored : undefined,
      set: async (namespace: string, key: string, value: unknown) => {
        if (namespace === MODULE_ID && key === SETTING_RULES_PROFILE) {
          stored = value;
          clearRulesCache();
        }
        return value;
      }
    }
  };
  clearRulesCache();

  return () => {
    globalScope.game = previous;
    clearRulesCache();
  };
}

/** A world that has entered no rules numbers at all. */
export function withNoRules(): () => void {
  return withRules(BLANK_PROFILE);
}

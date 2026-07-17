export interface CombatantLike {
  id: string;
  initiative: null;
}

export interface BattleframeCombatFlags {
  order: string[];
}

export interface CombatFlagsLike {
  battleframe?: BattleframeCombatFlags;
}

export interface CombatLike {
  combatants: CombatantLike[];
  flags?: CombatFlagsLike;
}

export interface TrackerRenderContext {
  combatants: CombatantLike[];
  [key: string]: unknown;
}

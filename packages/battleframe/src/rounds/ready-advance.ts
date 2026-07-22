/**
 * Player-driven round advancement — GM-less play.
 *
 * A BattleFrame game is set up by a GM but PLAYED by the players: no one should
 * have to be the GM to advance the game. So instead of a GM clicking "next turn",
 * every participant marks "ready to advance"; when ALL are ready a short, settable
 * countdown runs; at its end the round advances and the ready flags clear. Any
 * participant un-readying cancels the countdown. This is neutral turn plumbing —
 * WHAT "advance the round" does is a ruleset's, registered via `registerAdvance`.
 *
 * Coordination without a GM: ready state lives on a synced Document (the active
 * Combat, else the Scene), so every client sees the same flags. Each client
 * evaluates the same pure predicates; only the deterministic HOST (the
 * lexicographically-smallest active participant) runs the countdown timer and
 * performs the advance, so the round advances exactly once.
 *
 * The pure decisions (participants / all-ready / host / ready-map toggle) are
 * unit-tested; the timer + Document + hook wiring is defensive glue.
 */

import { battleframeNamespace } from "../api/index";
import { SYSTEM_ID } from "../constants";

// --- Pure core (unit-tested) ------------------------------------------------

export interface UserLike {
  id: string;
  active?: boolean;
  isGM?: boolean;
}

/**
 * The users whose readiness gates the advance: the active non-GM players. If no
 * non-GM player is connected (a GM testing solo), the active users stand in so a
 * lone GM can still advance.
 */
export function participantsOf(users: readonly UserLike[]): string[] {
  const players = users.filter((u) => u.active && !u.isGM).map((u) => u.id);
  if (players.length > 0) {
    return players;
  }
  return users.filter((u) => u.active).map((u) => u.id);
}

/** True only when every participant has readied (and there is at least one). */
export function allReady(readyIds: readonly string[], participantIds: readonly string[]): boolean {
  if (participantIds.length === 0) {
    return false;
  }
  const ready = new Set(readyIds);
  return participantIds.every((id) => ready.has(id));
}

/** The single client that runs the timer + advance: the smallest participant id. */
export function advancingHost(participantIds: readonly string[]): string | undefined {
  if (participantIds.length === 0) {
    return undefined;
  }
  return [...participantIds].sort()[0];
}

/** Flips a user's ready flag in the ready map (returns a new map). */
export function toggledReady(map: Record<string, boolean>, userId: string): Record<string, boolean> {
  const next = { ...map };
  if (next[userId]) {
    delete next[userId];
  } else {
    next[userId] = true;
  }
  return next;
}

// --- Foundry glue (defensive) -----------------------------------------------

/** The flag holding the ready map on the active Combat / Scene. */
const READY_FLAG = "readyToAdvance";
const TIMER_SETTING = "advanceTimerSeconds";
const DEFAULT_TIMER = 5;

interface FlagDoc {
  getFlag?: (scope: string, key: string) => unknown;
  setFlag?: (scope: string, key: string, value: unknown) => Promise<unknown>;
}

interface Glob {
  game?: {
    user?: { id?: string };
    users?: UserLike[] | { filter?: (fn: (u: UserLike) => boolean) => UserLike[]; [Symbol.iterator]?: unknown };
    combats?: { active?: FlagDoc };
    settings?: {
      get?: (scope: string, key: string) => unknown;
      register?: (scope: string, key: string, data: Record<string, unknown>) => void;
    };
  };
  canvas?: { scene?: FlagDoc };
  Hooks?: { on?: (event: string, cb: (...args: any[]) => void) => void };
  ui?: { notifications?: { info?: (m: string) => void } };
}

function glob(): Glob {
  return globalThis as unknown as Glob;
}

/** The Document readiness lives on: the active Combat, else the active Scene. */
function readyDoc(): FlagDoc | undefined {
  return glob().game?.combats?.active ?? glob().canvas?.scene;
}

function usersList(): UserLike[] {
  const users = glob().game?.users;
  if (Array.isArray(users)) {
    return users;
  }
  if (users && typeof (users as any)[Symbol.iterator] === "function") {
    return Array.from(users as Iterable<UserLike>);
  }
  return [];
}

function readyMap(): Record<string, boolean> {
  const raw = readyDoc()?.getFlag?.(SYSTEM_ID, READY_FLAG);
  return raw && typeof raw === "object" ? (raw as Record<string, boolean>) : {};
}

function timerSeconds(): number {
  const raw = glob().game?.settings?.get?.(SYSTEM_ID, TIMER_SETTING);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TIMER;
}

/** The ruleset's "advance the round" behaviour, registered at init. */
let advanceCallback: (() => void | Promise<void>) | undefined;
let countdownTimer: ReturnType<typeof setTimeout> | undefined;

function cancelCountdown(): void {
  if (countdownTimer !== undefined) {
    clearTimeout(countdownTimer);
    countdownTimer = undefined;
  }
}

/**
 * Re-evaluated on every ready-flag change: if all participants are ready and I am
 * the host, run the countdown then advance; otherwise cancel any pending advance.
 */
async function evaluate(): Promise<void> {
  try {
    const participants = participantsOf(usersList());
    const ready = Object.entries(readyMap()).filter(([, v]) => v).map(([id]) => id);
    const me = glob().game?.user?.id;

    if (!allReady(ready, participants)) {
      cancelCountdown();
      return;
    }
    // All ready. Only the host counts down + advances, so it happens once.
    if (me !== advancingHost(participants) || countdownTimer !== undefined) {
      return;
    }
    const seconds = timerSeconds();
    glob().ui?.notifications?.info?.(`${SYSTEM_ID} | all players ready -- advancing in ${seconds}s`);
    countdownTimer = setTimeout(() => {
      void performAdvance();
    }, seconds * 1000);
  } catch {
    /* readiness must never throw into a hook */
  }
}

async function performAdvance(): Promise<void> {
  cancelCountdown();
  try {
    // Clear ready flags first so the advance starts a fresh round for everyone.
    await readyDoc()?.setFlag?.(SYSTEM_ID, READY_FLAG, {});
    await advanceCallback?.();
  } catch {
    /* an advance failure must not wedge the ready state */
  }
}

export interface ReadyAdvanceApi {
  /** Register the ruleset's "advance the round" behaviour (called once, at init). */
  registerAdvance(fn: () => void | Promise<void>): void;
  /** Toggle the current user's ready flag. */
  toggleReady(): Promise<void>;
  /** Whether the current user (or `userId`) is ready. */
  isReady(userId?: string): boolean;
  /** A snapshot for a UI: who is ready, who participates, and whether all are ready. */
  status(): { ready: string[]; participants: string[]; allReady: boolean };
}

export function createReadyAdvanceApi(): ReadyAdvanceApi {
  return {
    registerAdvance(fn) {
      advanceCallback = fn;
    },
    async toggleReady() {
      const me = glob().game?.user?.id;
      if (!me) {
        return;
      }
      await readyDoc()?.setFlag?.(SYSTEM_ID, READY_FLAG, toggledReady(readyMap(), me));
    },
    isReady(userId) {
      const id = userId ?? glob().game?.user?.id;
      return !!id && !!readyMap()[id];
    },
    status() {
      const participants = participantsOf(usersList());
      const ready = Object.entries(readyMap()).filter(([, v]) => v).map(([id]) => id);
      return { ready, participants, allReady: allReady(ready, participants) };
    }
  };
}

declare global {
  interface BattleframeGameNamespace {
    advance?: ReadyAdvanceApi;
  }
}

/** Installs the advance service onto the shared namespace (before any `init`). */
export function installReadyAdvanceApi(): ReadyAdvanceApi {
  const namespace = battleframeNamespace();
  namespace.advance = namespace.advance ?? createReadyAdvanceApi();
  return namespace.advance;
}

/** Registers the settable timer setting + the ready-flag change listeners. Call at init. */
export function registerReadyAdvance(): void {
  glob().game?.settings?.register?.(SYSTEM_ID, TIMER_SETTING, {
    name: "Turn-advance countdown (seconds)",
    hint: "When all players mark ready, the round advances after this countdown. A player un-readying cancels it.",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_TIMER
  });
  const hooks = glob().Hooks;
  if (hooks?.on) {
    hooks.on("updateCombat", () => void evaluate());
    hooks.on("updateScene", () => void evaluate());
    hooks.on("userConnected", () => void evaluate());
  }
}

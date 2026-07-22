/**
 * A guard for the secret-plotting invariant: plotting stays hidden only while
 * each player can observe just their OWN ships. If a ship's ownership is changed
 * so that a second (non-GM) player can observe it, that player can read its
 * secretly-plotted order flag -- so we warn whoever made the change.
 *
 * The detection is pure and tested; the hook + warning dialog are thin Foundry
 * glue (UNVERIFIED against a live world).
 */

import { MODULE_ID, SHIP_ACTOR_TYPE } from "../constants";

/** Foundry ownership level at/above which a user reads the full document (flags). */
const OBSERVER = 2;

export interface OwnershipMap {
  default?: number;
  [userId: string]: number | undefined;
}

export interface UserLike {
  id: string;
  isGM: boolean;
}

/** Effective ownership level for a user: their explicit level, else the default. */
function levelFor(ownership: OwnershipMap, userId: string): number {
  return ownership[userId] ?? ownership.default ?? 0;
}

/**
 * True when two or more NON-GM players can observe (>= OBSERVER) the ship -- the
 * point at which an opponent, not just the owner, could read the plotted order.
 */
export function plotSecrecyAtRisk(ownership: OwnershipMap, users: readonly UserLike[]): boolean {
  let observers = 0;
  for (const user of users) {
    if (user.isGM) {
      continue;
    }
    if (levelFor(ownership, user.id) >= OBSERVER) {
      observers += 1;
      if (observers >= 2) {
        return true;
      }
    }
  }
  return false;
}

interface GlobalScope {
  Hooks?: { on?: (event: string, cb: (...args: any[]) => void) => void };
  game?: { users?: Iterable<UserLike> | UserLike[] };
  foundry?: { applications?: { api?: { DialogV2?: { prompt: (opts: unknown) => Promise<unknown> } } } };
  ui?: { notifications?: { warn?: (t: string) => void } };
}

function g(): GlobalScope {
  return globalThis as unknown as GlobalScope;
}

function allUsers(): UserLike[] {
  const users = g().game?.users;
  if (!users) {
    return [];
  }
  return Array.from(users as Iterable<UserLike>).map((u) => ({ id: u.id, isGM: u.isGM }));
}

/** Shows the secrecy warning as a dialog, falling back to a notification. */
function warnSecrecy(actorName: string): void {
  const message =
    `${actorName}: two or more players can now see this ship. Full Thrust plotting is ` +
    `hidden only while each player owns just their own ships -- an opponent who can observe ` +
    `this ship can read its secretly-plotted movement order. Give the opponent no permission ` +
    `on ships they do not command.`;

  const dialog = g().foundry?.applications?.api?.DialogV2;
  if (dialog?.prompt) {
    void dialog.prompt({
      window: { title: "Full Thrust: plotting secrecy warning" },
      content: `<p>${message}</p>`,
      ok: { label: "Understood" }
    });
    return;
  }
  g().ui?.notifications?.warn?.(`${MODULE_ID} | ${message}`);
}

/**
 * Registers the ownership-change guard: when a ship Actor's ownership changes to
 * a state where 2+ players can observe it, warn the user who made the change.
 */
export function registerOwnershipWarning(): void {
  const hooks = g().Hooks;
  if (!hooks?.on) {
    return;
  }
  hooks.on("updateActor", (actor: any, changes: any) => {
    if (typeof actor?.type !== "string" || !actor.type.endsWith(SHIP_ACTOR_TYPE)) {
      return;
    }
    if (!changes?.ownership) {
      return;
    }
    const ownership = (actor.ownership ?? changes.ownership) as OwnershipMap;
    if (plotSecrecyAtRisk(ownership, allUsers())) {
      warnSecrecy(actor.name ?? "This ship");
    }
  });
}

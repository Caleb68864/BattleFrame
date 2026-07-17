import { MODULE_ID, type ActionId, type DieFace } from "../constants";
import { actionForFace } from "../round/actions";
import { actionHint } from "../round/action-hints";
import type { IllegalTargetReason, RoundSession } from "../round/session";
import {
  createHighlightController,
  resolveTintApi,
  type HighlightController,
  type TintApiLike,
} from "./highlight";
import { isGM } from "./round-control";

/**
 * A knight as the panel needs to know it for display: name only. Everything
 * that decides whether a die may hit this knight comes from the session --
 * see buildKnightViewModels.
 */
export interface PoolPanelKnight {
  id: string;
  playerId: string;
  name: string;
  /**
   * The real canvas Token placeable, passed straight through to the highlight
   * controller's tint API. `unknown` because this module never reads it.
   */
  token?: unknown;
}

export interface DieViewModel {
  id: string;
  playerId: string;
  face: DieFace;
  /** Literal i18n key, resolved by ACTION_NAME_KEYS below -- never assembled at render time. */
  actionKey: string;
  /**
   * One line saying what this die actually does, with its rules numbers filled
   * in from constants.ts. This is the difference between a panel a rules-naive
   * player can use and one that shows them "3 Shift" and nothing else.
   */
  hint: string;
  /** Whether this specific die may legally be played right now, per the session's turn/order state. */
  offerable: boolean;
  selected: boolean;
}

export interface KnightViewModel {
  id: string;
  name: string;
  legal: boolean;
  /** Literal i18n key for the session's reason, present only when illegal. */
  reasonKey?: string;
}

/**
 * Every action's display name, keyed by ActionId. Exhaustive at the type
 * level -- TypeScript rejects this object if a new ActionId is added to
 * constants.ts without a matching entry here, so a missing translation
 * fails the build instead of rendering a raw key at the table.
 */
const ACTION_NAME_KEYS: Readonly<Record<ActionId, string>> = {
  sprint: "battleframe-greathelm.actions.sprint",
  encircle: "battleframe-greathelm.actions.encircle",
  bash: "battleframe-greathelm.actions.bash",
  shift: "battleframe-greathelm.actions.shift",
  light: "battleframe-greathelm.actions.light",
  heavy: "battleframe-greathelm.actions.heavy",
};

/**
 * Every reason the session may give for an illegal target, keyed by
 * IllegalTargetReason. Same exhaustiveness guarantee as ACTION_NAME_KEYS
 * above: a new reason added to round/session.ts breaks this object's type
 * until a translation is added here, rather than shipping as a raw key.
 */
const ILLEGAL_REASON_KEYS: Readonly<Record<IllegalTargetReason, string>> = {
  "knight-removed": "battleframe-greathelm.poolPanel.reasons.knightRemoved",
  "no-enemy-in-base-contact": "battleframe-greathelm.poolPanel.reasons.noEnemyInContact",
};

/**
 * View models for every unspent die, both sides. `offerable` is derived
 * from the session's own public accessors (`remainingDice`, `activePlayerId`)
 * -- never from a locally re-implemented copy of the 6-to-1 rule -- so a die
 * this player cannot yet play is shown, not hidden, with the reason visible
 * as "an unspent higher face exists" rather than the panel pretending the
 * die does not exist.
 */
export function buildDieViewModels(
  session: RoundSession,
  selectedDieId: string | undefined
): DieViewModel[] {
  const dice = session.remainingDice();
  const activePlayerId = session.activePlayerId();

  let highestUnspentFace: DieFace | undefined;
  for (const die of dice) {
    if (highestUnspentFace === undefined || die.face > highestUnspentFace) {
      highestUnspentFace = die.face;
    }
  }

  return dice.map((die) => ({
    id: die.id,
    playerId: die.playerId,
    face: die.face,
    actionKey: ACTION_NAME_KEYS[actionForFace(die.face)],
    hint: actionHint(actionForFace(die.face)),
    offerable: die.playerId === activePlayerId && die.face === highestUnspentFace,
    selected: die.id === selectedDieId,
  }));
}

/**
 * View models for every knight the selected die could target, re-derived
 * from `session.legalTargetsFor` on every call. The panel never caches this
 * and never asks anything but the session whether a target is legal.
 */
export function buildKnightViewModels(
  session: RoundSession,
  knights: readonly PoolPanelKnight[],
  selectedDieId: string
): KnightViewModel[] {
  const targets = session.legalTargetsFor(selectedDieId);
  const knightsById = new Map(knights.map((knight) => [knight.id, knight]));

  return targets.map((target): KnightViewModel => {
    const knight = knightsById.get(target.knightId);

    return {
      id: target.knightId,
      name: knight?.name ?? target.knightId,
      legal: target.legal,
      reasonKey: target.reason ? ILLEGAL_REASON_KEYS[target.reason] : undefined,
    };
  });
}

export type ApplicationV2BaseConstructor = new (...args: any[]) => {
  render?: (...args: any[]) => unknown;
  element?: unknown;
};

type HandlebarsApplicationMixinFn = (
  base: ApplicationV2BaseConstructor
) => ApplicationV2BaseConstructor;

export class MissingApplicationV2BaseError extends Error {
  constructor() {
    super(`${MODULE_ID} | no ApplicationV2 base class found on foundry.applications.api.ApplicationV2`);
    this.name = "MissingApplicationV2BaseError";
  }
}

function resolveFoundryApplications(): {
  ApplicationV2?: ApplicationV2BaseConstructor;
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn;
} {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        api?: {
          ApplicationV2?: ApplicationV2BaseConstructor;
          HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn;
        };
      };
    };
  };

  return {
    ApplicationV2: globalScope.foundry?.applications?.api?.ApplicationV2,
    HandlebarsApplicationMixin: globalScope.foundry?.applications?.api?.HandlebarsApplicationMixin,
  };
}

export interface PoolPanelConstructorOptions {
  session: RoundSession;
  knights: readonly PoolPanelKnight[];
  /** Injectable for tests; production resolves its own from the live canvas. */
  highlights?: HighlightController;
  /** Injectable for tests; production feature-detects via `resolveTintApi()`. */
  tintApi?: TintApiLike;
  /** Called once the round completes (last die spent + courage resolved). */
  onRoundComplete?: () => void | Promise<void>;
  [key: string]: unknown;
}

export interface PoolPanelInstance {
  session: RoundSession;
  knights: readonly PoolPanelKnight[];
  selectedDieId: string | undefined;
  render: (...args: any[]) => unknown;
  element?: unknown;
  selectDie: (dieId: string) => void;
  spendOnKnight: (knightId: string) => Promise<void>;
  onRoundComplete?: () => void | Promise<void>;
  _prepareContext: (options: unknown) => Promise<Record<string, unknown>>;
  _onRender?: (context: unknown, options: unknown) => Promise<void>;
}

/**
 * The GM-only affordance: click an unspent die, then click the knight it
 * activates. Built on ApplicationV2 directly (not a document sheet -- there
 * is no single document this panel edits) mixed with
 * HandlebarsApplicationMixin, per vault/foundry-systems/applicationv2-sheet-structure.md.
 *
 * Holds no rules state of its own: `selectedDieId` is pure UI selection, and
 * every legality question -- which dice are offerable, which knights a die
 * may hit, why not -- is answered fresh from `session` on every render.
 */
export function createPoolPanelClass(
  ApplicationV2Base?: ApplicationV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ApplicationV2BaseConstructor {
  const resolved = resolveFoundryApplications();
  const base = ApplicationV2Base ?? resolved.ApplicationV2;
  const mixin = HandlebarsApplicationMixin ?? resolved.HandlebarsApplicationMixin;

  if (!base) {
    throw new MissingApplicationV2BaseError();
  }

  const MixedBase = mixin ? mixin(base) : base;

  class PoolPanel extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-pool-panel`,
      classes: [MODULE_ID, "pool-panel"],
      tag: "div",
      window: { title: "battleframe-greathelm.poolPanel.title" },
      position: { width: 380, height: "auto" },
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/pool-panel.hbs` },
    };

    session: RoundSession;
    knights: readonly PoolPanelKnight[];
    selectedDieId: string | undefined;
    highlights: HighlightController;
    onRoundComplete: (() => void | Promise<void>) | undefined;

    constructor(options: PoolPanelConstructorOptions) {
      super(options);
      this.session = options.session;
      this.knights = options.knights;
      this.selectedDieId = undefined;
      this.onRoundComplete = options.onRoundComplete;
      this.highlights =
        options.highlights ??
        createHighlightController({
          session: options.session,
          knights: options.knights.map((knight) => ({ id: knight.id, token: knight.token })),
          tintApi: options.tintApi ?? resolveTintApi(),
        });
    }

    /** GM-only: a hidden panel is not access control, so every entry point checks this too. */
    static canUserAccess(): boolean {
      return isGM();
    }

    selectDie(dieId: string): void {
      this.selectedDieId = this.selectedDieId === dieId ? undefined : dieId;
      this.highlights.update(this.selectedDieId);
      void (this as unknown as { render: (force?: boolean) => unknown }).render(true);
    }

    async spendOnKnight(knightId: string): Promise<void> {
      if (!PoolPanel.canUserAccess() || !this.selectedDieId) {
        return;
      }

      const dieId = this.selectedDieId;
      this.selectedDieId = undefined;
      await this.session.spendDie(dieId, knightId);
      // After the spend, not before: `update` short-circuits to a clear once
      // the session completes, so the last die of a round leaves no tint behind.
      this.highlights.update(this.selectedDieId);
      void (this as unknown as { render: (force?: boolean) => unknown }).render(true);

      // The round is over the moment the last die is spent and the courage
      // phase has run. The panel reports that and holds no opinion about what
      // happens next -- whether the game has been won, and whether a new round
      // starts, is GREATHELM's rule, resolved by the caller.
      if (this.session.isComplete()) {
        await this.onRoundComplete?.();
      }
    }

    /** Tints are client-render state, not document state -- nothing else will clean them up. */
    async _onClose(options: unknown): Promise<void> {
      this.highlights.close();

      if (typeof super._onClose === "function") {
        await super._onClose(options);
      }
    }

    async _onRender(context: unknown, options: unknown): Promise<void> {
      if (typeof super._onRender === "function") {
        await super._onRender(context, options);
      }

      const root = (this as unknown as { element?: { querySelectorAll?: Function } }).element;

      if (!root?.querySelectorAll) {
        return;
      }

      const dieButtons = root.querySelectorAll("[data-die-id]") as Iterable<HTMLElement>;

      for (const el of dieButtons) {
        el.addEventListener("click", () => {
          const dieId = el.dataset.dieId;

          if (dieId) {
            this.selectDie(dieId);
          }
        });
      }

      const knightButtons = root.querySelectorAll("[data-knight-id]") as Iterable<HTMLElement>;

      for (const el of knightButtons) {
        el.addEventListener("click", () => {
          const knightId = el.dataset.knightId;

          if (knightId) {
            void this.spendOnKnight(knightId);
          }
        });
      }
    }

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};

      const canAccess = PoolPanel.canUserAccess();
      context.canAccess = canAccess;
      context.selectedDieId = this.selectedDieId ?? null;
      context.dice = buildDieViewModels(this.session, this.selectedDieId);
      context.knights = this.selectedDieId
        ? buildKnightViewModels(this.session, this.knights, this.selectedDieId)
        : [];

      return context;
    }
  }

  return PoolPanel as unknown as ApplicationV2BaseConstructor;
}

/** Opens the panel for the current user, refusing (with a notice) if they are not the GM. */
export function openPoolPanel(
  session: RoundSession,
  knights: readonly PoolPanelKnight[],
  onRoundComplete?: () => void | Promise<void>
): PoolPanelInstance | undefined {
  const PanelClass = createPoolPanelClass();

  if (!(PanelClass as unknown as { canUserAccess?: () => boolean }).canUserAccess?.()) {
    return undefined;
  }

  const panel = new (PanelClass as unknown as new (
    options: PoolPanelConstructorOptions
  ) => PoolPanelInstance)({ session, knights, onRoundComplete });

  void (panel as unknown as { render: (force?: boolean) => unknown }).render(true);

  return panel;
}

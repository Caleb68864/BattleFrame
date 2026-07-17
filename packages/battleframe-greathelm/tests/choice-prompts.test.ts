import { afterEach, describe, expect, it, vi } from "vitest";
import {
  promptAttackTarget,
  promptFirstOrSecond,
  resolveDialogChooser,
  type DialogChooserLike,
  type WorldSettingsLike,
} from "../src/ui/choice-prompts";
import {
  SETTING_PROMPT_ATTACK_TARGET,
  SETTING_PROMPT_FIRST_OR_SECOND,
} from "../src/constants";
import type { InitiativeOutcome } from "../src/round/dice-pool";

function settingsWith(values: Record<string, boolean>): WorldSettingsLike {
  return {
    get: (_namespace, key) => values[key],
  };
}

const CHOOSE_OUTCOME: InitiativeOutcome = { result: "choose", playerId: "player-a" };
const FORCED_FIRST_OUTCOME: InitiativeOutcome = { result: "forced-first", playerId: "player-a" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("promptFirstOrSecond", () => {
  it("prompts the winner when they may choose", async () => {
    const dialog: DialogChooserLike = { choose: vi.fn().mockResolvedValue("second") };

    const choice = await promptFirstOrSecond({
      outcome: CHOOSE_OUTCOME,
      settings: settingsWith({ [SETTING_PROMPT_FIRST_OR_SECOND]: true }),
      dialog,
    });

    expect(choice).toBe("second");
    expect(dialog.choose).toHaveBeenCalledTimes(1);
  });

  it("never prompts when forced-first applies -- it is a rule, not a choice", async () => {
    const dialog: DialogChooserLike = { choose: vi.fn().mockResolvedValue("second") };

    const choice = await promptFirstOrSecond({
      outcome: FORCED_FIRST_OUTCOME,
      settings: settingsWith({ [SETTING_PROMPT_FIRST_OR_SECOND]: true }),
      dialog,
    });

    expect(choice).toBe("first");
    expect(dialog.choose).not.toHaveBeenCalled();
  });

  it("falls back to the documented default when the prompt is disabled", async () => {
    const dialog: DialogChooserLike = { choose: vi.fn().mockResolvedValue("second") };

    const choice = await promptFirstOrSecond({
      outcome: CHOOSE_OUTCOME,
      settings: settingsWith({ [SETTING_PROMPT_FIRST_OR_SECOND]: false }),
      dialog,
    });

    expect(choice).toBe("first");
    expect(dialog.choose).not.toHaveBeenCalled();
  });

  it("falls back to the default and logs when no dialog API resolves", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const choice = await promptFirstOrSecond({
      outcome: CHOOSE_OUTCOME,
      settings: settingsWith({ [SETTING_PROMPT_FIRST_OR_SECOND]: true }),
      dialog: null,
    });

    expect(choice).toBe("first");
    expect(logSpy).toHaveBeenCalled();
  });

  it("falls back to the default and logs when the dialog rejects, never blocking the round", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const dialog: DialogChooserLike = { choose: vi.fn().mockRejectedValue(new Error("boom")) };

    const choice = await promptFirstOrSecond({
      outcome: CHOOSE_OUTCOME,
      settings: settingsWith({ [SETTING_PROMPT_FIRST_OR_SECOND]: true }),
      dialog,
    });

    expect(choice).toBe("first");
    expect(logSpy).toHaveBeenCalled();
  });
});

describe("promptAttackTarget", () => {
  const enemyA = { id: "enemy-a", name: "Enemy A" };
  const enemyB = { id: "enemy-b", name: "Enemy B" };

  it("prompts the attacker when 2+ enemies are in base contact", async () => {
    const dialog: DialogChooserLike = { choose: vi.fn().mockResolvedValue("enemy-b") };

    const target = await promptAttackTarget({
      candidates: [enemyA, enemyB],
      settings: settingsWith({ [SETTING_PROMPT_ATTACK_TARGET]: true }),
      dialog,
    });

    expect(target).toBe(enemyB);
    expect(dialog.choose).toHaveBeenCalledTimes(1);
  });

  it("never prompts with exactly one enemy in base contact", async () => {
    const dialog: DialogChooserLike = { choose: vi.fn().mockResolvedValue("enemy-a") };

    const target = await promptAttackTarget({
      candidates: [enemyA],
      settings: settingsWith({ [SETTING_PROMPT_ATTACK_TARGET]: true }),
      dialog,
    });

    expect(target).toBe(enemyA);
    expect(dialog.choose).not.toHaveBeenCalled();
  });

  it("falls back to the first candidate when the prompt is disabled", async () => {
    const dialog: DialogChooserLike = { choose: vi.fn().mockResolvedValue("enemy-b") };

    const target = await promptAttackTarget({
      candidates: [enemyA, enemyB],
      settings: settingsWith({ [SETTING_PROMPT_ATTACK_TARGET]: false }),
      dialog,
    });

    expect(target).toBe(enemyA);
    expect(dialog.choose).not.toHaveBeenCalled();
  });

  it("falls back to the first candidate and logs when no dialog API resolves", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const target = await promptAttackTarget({
      candidates: [enemyA, enemyB],
      settings: settingsWith({ [SETTING_PROMPT_ATTACK_TARGET]: true }),
      dialog: null,
    });

    expect(target).toBe(enemyA);
    expect(logSpy).toHaveBeenCalled();
  });
});

describe("resolveDialogChooser", () => {
  it("is undefined when foundry.applications.api.DialogV2.wait is absent", () => {
    vi.stubGlobal("foundry", undefined);

    expect(resolveDialogChooser()).toBeUndefined();
  });

  it("feature-detects DialogV2.wait and resolves the clicked button's action id", async () => {
    const wait = vi.fn().mockResolvedValue("second");
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { wait } } } });

    const dialog = resolveDialogChooser();

    expect(dialog).toBeDefined();

    const chosen = await dialog?.choose({
      title: "Go first or second?",
      content: "<p>...</p>",
      buttons: [
        { id: "first", label: "First" },
        { id: "second", label: "Second" },
      ],
    });

    expect(chosen).toBe("second");
    expect(wait).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { promptResetConfirmation, resolveDialogChooser } from "../src/ui/choice-prompts";

/**
 * Foundry's static DialogV2.wait/confirm read `this` (`new this(...)`,
 * `this.wait(...)`). A detached reference throws, and every prompt's catch then
 * quietly takes its default: the reset never runs, the initiative winner is never
 * asked. These stubs read `this` the same way, so the bug cannot hide behind a
 * `vi.fn()`, which does not care how it is called.
 */
function thisReadingDialog(result: unknown) {
  return {
    wait(this: unknown): Promise<unknown> {
      if (this === undefined) throw new TypeError("detached DialogV2.wait");
      return Promise.resolve(result);
    },
    confirm(this: unknown): Promise<unknown> {
      if (this === undefined) throw new TypeError("detached DialogV2.confirm");
      return Promise.resolve(result);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("choice prompts call DialogV2 as a method", () => {
  it("resolves the clicked button through a this-reading DialogV2.wait", async () => {
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: thisReadingDialog("second") } } });

    const chosen = await resolveDialogChooser()?.choose({
      title: "t",
      content: "c",
      buttons: [{ id: "second", label: "Second" }],
    });

    expect(chosen).toBe("second");
  });

  it("the reset confirmation survives a this-reading DialogV2.confirm", async () => {
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: thisReadingDialog(true) } } });

    expect(await promptResetConfirmation()).toBe(true);
  });
});

describe("promptResetConfirmation uses DialogV2.confirm", () => {
  it("goes through confirm rather than a hand-built two-button wait", async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const wait = vi.fn();
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { wait, confirm } } } });

    expect(await promptResetConfirmation()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("treats a refusal or a dismissal as no", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { confirm, wait: vi.fn() } } } });

    expect(await promptResetConfirmation()).toBe(false);
    confirm.mockResolvedValue(null);
    expect(await promptResetConfirmation()).toBe(false);
  });

  it("a throwing confirm is not consent", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const confirm = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { confirm, wait: vi.fn() } } } });

    expect(await promptResetConfirmation()).toBe(false);
  });
});

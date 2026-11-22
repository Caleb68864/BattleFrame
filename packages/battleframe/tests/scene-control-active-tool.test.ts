import { afterEach, describe, expect, it, vi } from "vitest";
import { addSceneControl as simpleSkirmish } from "../../battleframe-simple-skirmish/src/ui/round-control";
import { addSceneControl as inCountry } from "../../battleframe-incountry/src/ui/round-control";
import { addSceneControl as stargrunt } from "../../battleframe-stargrunt-ii/src/ui/round-control";
import { addSceneControl as dirtside } from "../../battleframe-dirtside-ii/src/ui/round-control";
import { addSceneControl as fullThrust } from "../../battleframe-full-thrust/src/ui/round-control";
import { addRoundSceneControl as greathelm } from "../../battleframe-greathelm/src/ui/round-control";

/**
 * A scene control's `activeTool` is the tool selected when the control is opened
 * (2026-11-21 audit). Simple Skirmish and GREATHELM named their GM-only Run Round
 * BUTTON: hidden from players, and its `onChange` runs the round, which Foundry
 * can fire when a tool becomes active, so opening the control could start a
 * round. The active tool must be visible to a non-GM player, and must not be a
 * button that acts on change. (Full Thrust's Plot button is its deliberate
 * default: visible to all and wired to onClick only.)
 */

afterEach(() => vi.unstubAllGlobals());

describe.each([
  ["Simple Skirmish", simpleSkirmish],
  ["InCountry", inCountry],
  ["Stargrunt II", stargrunt],
  ["Dirtside II", dirtside],
  ["Full Thrust", fullThrust],
  ["GREATHELM", greathelm]
] as const)("%s", (_name, add) => {
  it("opens on a tool a player can see, and opening it runs nothing", () => {
    vi.stubGlobal("game", { user: { isGM: false }, settings: { get: () => undefined } });
    const controls: Array<{
      activeTool?: string;
      tools: Array<{ name: string; visible?: boolean; button?: boolean; onChange?: unknown }>;
    }> = [];

    add(controls as never);

    const mine = controls[controls.length - 1];
    const active = mine.tools.find((t) => t.name === mine.activeTool);
    expect(active, `activeTool ${mine.activeTool} is not one of the control's tools`).toBeDefined();
    expect(active?.visible).not.toBe(false);
    if (active?.button) {
      expect(active.onChange, `${mine.activeTool} is a button that acts when selected`).toBeUndefined();
    }
  });
});

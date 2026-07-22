import { describe, expect, it } from "vitest";
import {
  beginRoundState,
  turnEndUpdate,
  addSceneControl,
  type RoundUnit,
} from "../src/ui/round-control";

const units = (...specs: Array<[string, string]>): RoundUnit[] =>
  specs.map(([id, playerId]) => ({ id, playerId }));

/**
 * G3/G4 round-control testable core. The scene-control payload + canvas reads are
 * defensive glue (live-verified); the round-state construction and the Turn-End
 * reset are pure and tested here.
 */

describe("beginRoundState — the fewer-units side chooses first", () => {
  it("starts the round with the outnumbered side and serializes clean state", () => {
    const { state, firstChooserId, tie } = beginRoundState(units(["a1", "A"], ["a2", "A"], ["b1", "B"]));
    expect(firstChooserId).toBe("B");
    expect(tie).toBe(false);
    expect(state.firstPlayerId).toBe("B");
    expect(state.activatedIds).toEqual([]);
  });

  it("flags a tie (equal counts) and still produces a playable first side", () => {
    const { firstChooserId, tie, state } = beginRoundState(units(["a1", "A"], ["b1", "B"]));
    expect(firstChooserId).toBeNull();
    expect(tie).toBe(true);
    expect(["A", "B"]).toContain(state.firstPlayerId);
  });
});

describe("turnEndUpdate — the Turn-End reset clears the markers", () => {
  it("clears activated and under-fire", () => {
    expect(turnEndUpdate()).toEqual({ "system.activated": false, "system.underFire": false });
  });
});

describe("addSceneControl — the DSII scene control", () => {
  it("pushes a control with ready/activate/end tools onto an array payload", () => {
    const controls: any[] = [];
    addSceneControl(controls);
    expect(controls).toHaveLength(1);
    const toolNames = controls[0].tools.map((t: any) => t.name);
    expect(toolNames).toContain("dirtside-ii-activate");
    expect(toolNames).toContain("dirtside-ii-end-turn");
  });

  it("supports the record-shaped payload too", () => {
    const controls: Record<string, any> = {};
    addSceneControl(controls);
    expect(controls["battleframe-dirtside-ii"]).toBeDefined();
    expect(controls["battleframe-dirtside-ii"].tools["dirtside-ii-activate"]).toBeDefined();
  });
});

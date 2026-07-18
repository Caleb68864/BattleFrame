import { describe, expect, it } from "vitest";
import { checkVictory, type VictoryUnit } from "../src/round/victory";

const u = (playerId: string, isDestroyed: boolean): VictoryUnit => ({ playerId, isDestroyed });

describe("checkVictory -- Basic Game deathmatch (last side with models wins)", () => {
  it("declares the winner when one side has no models left", () => {
    expect(checkVictory([u("a", false), u("b", true)])).toEqual({ result: "winner", playerId: "a" });
  });

  it("keeps playing while both sides still hold models", () => {
    expect(checkVictory([u("a", false), u("b", false)])).toEqual({ result: "continue" });
  });

  it("counts a side alive if any one of its units survives", () => {
    expect(
      checkVictory([u("a", false), u("a", true), u("b", true), u("b", true)])
    ).toEqual({ result: "winner", playerId: "a" });
  });

  it("reports a draw when neither side has models left, rather than inventing a winner", () => {
    expect(checkVictory([u("a", true), u("b", true)])).toEqual({ result: "draw" });
  });
});

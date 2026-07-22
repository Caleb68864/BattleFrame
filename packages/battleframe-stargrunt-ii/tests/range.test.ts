import { describe, expect, it } from "vitest";
import { rangeDieFromDistance } from "../src/combat/range";

/**
 * B6 — Range Die from distance. The band size is the Quality-die type in inches
 * (d8 -> 8"); the number of whole-or-part bands out to the target picks the base
 * Range Die (1->d4, 2->d6, 3->d8, 4->d10, 5->d12, >5 -> impossible). Cover (soft
 * +1, hard +2) and In-Position (+1) then shift that die UP the ladder; a shift
 * past d12 makes the shot impossible.
 */
describe("rangeDieFromDistance", () => {
  it("maps band count to the base range die (d8 quality => 8in bands)", () => {
    expect(rangeDieFromDistance(1, "d8", 0, false)).toBe("d4"); // band 1
    expect(rangeDieFromDistance(8, "d8", 0, false)).toBe("d4"); // still band 1
    expect(rangeDieFromDistance(9, "d8", 0, false)).toBe("d6"); // band 2
    expect(rangeDieFromDistance(16, "d8", 0, false)).toBe("d6");
    expect(rangeDieFromDistance(17, "d8", 0, false)).toBe("d8"); // band 3
    expect(rangeDieFromDistance(33, "d8", 0, false)).toBe("d12"); // band 5
  });

  it("uses the quality die type as the band size", () => {
    expect(rangeDieFromDistance(4, "d4", 0, false)).toBe("d4"); // 4in bands, band 1
    expect(rangeDieFromDistance(5, "d4", 0, false)).toBe("d6"); // band 2
    expect(rangeDieFromDistance(12, "d12", 0, false)).toBe("d4"); // 12in bands, band 1
  });

  it("is impossible beyond five bands", () => {
    expect(rangeDieFromDistance(41, "d8", 0, false)).toBe("impossible"); // band 6
  });

  it("shifts the range die up for cover", () => {
    expect(rangeDieFromDistance(1, "d8", 1, false)).toBe("d6"); // soft: d4 +1
    expect(rangeDieFromDistance(1, "d8", 2, false)).toBe("d8"); // hard: d4 +2
  });

  it("shifts the range die up for In-Position", () => {
    expect(rangeDieFromDistance(1, "d8", 0, true)).toBe("d6"); // d4 +1
    expect(rangeDieFromDistance(1, "d8", 2, true)).toBe("d10"); // d4 +2 +1
  });

  it("is impossible when the shift pushes the die past d12", () => {
    // band 5 -> d12; any cover/IP shift steps off the top.
    expect(rangeDieFromDistance(33, "d8", 1, false)).toBe("impossible");
  });
});

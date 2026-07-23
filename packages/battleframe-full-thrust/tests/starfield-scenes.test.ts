import { describe, expect, it } from "vitest";
import { starfieldSceneData } from "../src/ui/starfield-scenes";
import { MODULE_ID } from "../src/constants";

describe("starfieldSceneData", () => {
  const scenes = starfieldSceneData();

  it("provides the three shipped starfield scenes", () => {
    expect(scenes).toHaveLength(3);
    expect(scenes.map((s) => s.name)).toEqual([
      "Full Thrust — Deep Space",
      "Full Thrust — Nebula Field",
      "Full Thrust — Sparse Void"
    ]);
  });

  it("points each background at the module's shipped SVG asset", () => {
    for (const s of scenes) {
      const bg = s.background as { src: string };
      expect(bg.src).toMatch(new RegExp(`^modules/${MODULE_ID}/assets/scenes/[a-z-]+\\.svg$`));
    }
  });

  it("makes them gridless (Full Thrust is a no-grid space game), sized to the artwork", () => {
    for (const s of scenes) {
      expect((s.grid as { type: number }).type).toBe(0);
      expect(s.width).toBe(4000);
      expect(s.height).toBe(3000);
    }
  });
});

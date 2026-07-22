import { describe, expect, it } from "vitest";
import { buildAttackReportHtml } from "../src/ui/round-control";
import type { AttackFlowResult } from "../src/round/attack-flow";

/**
 * The pure attack-outcome chat-card builder. It renders WITHOUT a running
 * Foundry (no `game.battleframe`), so it exercises the module's no-engine
 * fallback markup -- the same card shape the engine's `chat.card` produces at
 * runtime. These guard the card's classes, its content, and (critically) that
 * user-editable unit names are HTML-escaped.
 */

function result(overrides: Partial<AttackFlowResult> = {}): AttackFlowResult {
  return {
    attack: {
      attackerFaces: [2, 9],
      hits: 1,
      attackTotal: 2,
      damage: 5,
      armorFaces: [3],
      armorTotal: 4,
      destroyed: false,
      ...overrides.attack
    },
    targetModelsAfter: 3,
    targetDestroyed: false,
    suppressed: false,
    ...overrides
  };
}

describe("buildAttackReportHtml", () => {
  const names = { attacker: "Alpha Squad", target: "Bravo Squad" };

  it("wraps the report in the shared card + incountry accent classes", () => {
    const html = buildAttackReportHtml(result(), names);
    expect(html).toContain("battleframe-card");
    expect(html).toContain("incountry-attack-report");
  });

  it("names the attacker and target in the heading", () => {
    const html = buildAttackReportHtml(result(), names);
    expect(html).toContain("Alpha Squad");
    expect(html).toContain("Bravo Squad");
  });

  it("reports the hits and damage outcome", () => {
    const html = buildAttackReportHtml(
      result({ attack: { hits: 2, damage: 7 } as AttackFlowResult["attack"] }),
      names
    );
    expect(html).toContain("2");
    expect(html).toContain("7");
  });

  it("marks a model down when a model dies but the unit survives", () => {
    const html = buildAttackReportHtml(
      result({
        attack: { destroyed: true } as AttackFlowResult["attack"],
        targetModelsAfter: 2,
        targetDestroyed: false
      }),
      names
    );
    expect(html.toLowerCase()).toContain("down");
  });

  it("announces suppression when the target is suppressed", () => {
    const html = buildAttackReportHtml(
      result({ suppressionRoll: 3, suppressed: true }),
      names
    );
    expect(html.toLowerCase()).toContain("suppress");
  });

  it("announces the target wiped out when no models remain", () => {
    const html = buildAttackReportHtml(
      result({
        attack: { destroyed: true } as AttackFlowResult["attack"],
        targetModelsAfter: 0,
        targetDestroyed: true
      }),
      names
    );
    expect(html.toLowerCase()).toContain("wiped");
  });

  it("HTML-escapes user-editable unit names (no raw markup injection)", () => {
    const html = buildAttackReportHtml(result(), {
      attacker: "<script>evil()</script>",
      target: "Foo & \"Bar\""
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });
});

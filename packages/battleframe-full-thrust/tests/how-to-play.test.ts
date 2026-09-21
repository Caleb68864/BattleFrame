import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildHowToPlayHtml,
  HOW_TO_PLAY_TITLE,
  registerHowToPlayJournal,
  createHowToPlayJournalIfMissing
} from "../src/ui/how-to-play";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


afterEach(() => vi.unstubAllGlobals());

describe("buildHowToPlayHtml", () => {
  const html = buildHowToPlayHtml();

  it("explains the token right-click HUD and its Plot / Fire buttons", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("right-click");
    expect(lower).toContain("hud");
    expect(lower).toContain("plot");
    expect(lower).toContain("fire");
  });

  it("walks the turn loop: plot, execute, fire phase, new turn", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("execute");
    expect(lower).toContain("fire phase");
    expect(lower).toContain("initiative");
    expect(lower).toContain("new turn");
    expect(lower).toContain("target");
  });

  it("covers giving a player a ship via ownership", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("ownership");
    expect(lower).toContain("owner");
  });

  it("points at GM-less play (assistant GM / socketlib + the docs)", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("gm-less");
    expect(lower).toMatch(/assistant gm|socketlib/);
    expect(lower).toContain("gm-less-play.md");
  });

  it("includes a legend mapping scene-tool icons to what they do", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("legend");
    expect(lower).toContain("fa-route"); // the Plot tool icon
    expect(lower).toContain("fa-play"); // the Execute tool icon
  });

  it("carries no rulebook numbers (usage guide only, stays neutral)", () => {
    // Guard against slipping rulebook stats in -- there should be no "6D6" style
    // dice notation or damage tables in the how-to-play guide.
    expect(html).not.toMatch(/\d+\s*[dD]\d+/);
  });

  it("is a single HTML string with headings", () => {
    expect(typeof html).toBe("string");
    expect(html).toContain("<h");
  });
});

describe("createHowToPlayJournalIfMissing", () => {
  function stubJournal(existingNames: string[], create = vi.fn().mockResolvedValue({})) {
    vi.stubGlobal("game", {
      user: { isGM: true },
      journal: existingNames.map((name) => ({ name }))
    });
    vi.stubGlobal("JournalEntry", { create });
    return create;
  }

  it("creates the journal when it does not yet exist", async () => {
    const create = stubJournal([]);
    await createHowToPlayJournalIfMissing();
    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0][0];
    expect(arg.name).toBe(HOW_TO_PLAY_TITLE);
    expect(Array.isArray(arg.pages)).toBe(true);
    expect(arg.pages[0].text.content).toContain("Plot");
  });

  it("does not create a duplicate when one already exists (idempotent)", async () => {
    const create = stubJournal([HOW_TO_PLAY_TITLE]);
    await createHowToPlayJournalIfMissing();
    expect(create).not.toHaveBeenCalled();
  });

  it("does nothing for a non-GM user (players cannot create world journals)", async () => {
    const create = vi.fn();
    vi.stubGlobal("game", { user: { isGM: false }, journal: [] });
    vi.stubGlobal("JournalEntry", { create });
    await createHowToPlayJournalIfMissing();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("registerHowToPlayJournal", () => {
  it("registers a ready hook", () => {
    const once = vi.fn();
    vi.stubGlobal("Hooks", { once });
    registerHowToPlayJournal();
    expect(once).toHaveBeenCalledWith("ready", expect.any(Function));
  });
});

/**
 * The chat service: a neutral HTML-entity escaper for any module that builds
 * markup from user-editable strings (token names, notes). The engine already
 * needed it internally (hover panel) and a ruleset re-declared an identical copy
 * — engine-extraction scan #2, finding 4. Only the escaper is extracted; the
 * outcome-card builder stays a ruleset's until a second module posts chat.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatApi, card, postCard } from "../src/ui/chat";

const api = createChatApi();

afterEach(() => vi.unstubAllGlobals());

describe("chat.escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(api.escapeHtml(`<img src="x" onerror='y'>&`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;"
    );
  });

  it("leaves ordinary text unchanged", () => {
    expect(api.escapeHtml("RNS Lion 3")).toBe("RNS Lion 3");
  });

  it("coerces non-string input instead of crashing (a caller escaping a numeric or missing stat)", () => {
    // escapeHtml is the shared escaper every module uses to build chat/card markup
    // from dynamic values. A caller escaping a numeric result or a missing field
    // (e.g. escapeHtml(unit.models)) must not throw `value.replace is not a function`
    // and take the whole card down with it -- coerce, exactly as the internal hover
    // caller already String()s its values before escaping.
    expect(api.escapeHtml(5 as unknown as string)).toBe("5");
    expect(api.escapeHtml(undefined as unknown as string)).toBe("undefined");
    expect(api.escapeHtml(null as unknown as string)).toBe("null");
  });
});

describe("chat.card", () => {
  it("wraps a title and body lines in the neutral card container", () => {
    expect(card({ title: "A &rarr; B", lines: ["<p>one</p>", "<p>two</p>"] })).toBe(
      '<div class="battleframe-card">' +
        '<h3 class="battleframe-card__title">A &rarr; B</h3>' +
        "<p>one</p><p>two</p>" +
        "</div>"
    );
  });

  it("omits the title element when no title is given", () => {
    expect(card({ lines: ["<p>only body</p>"] })).toBe(
      '<div class="battleframe-card"><p>only body</p></div>'
    );
  });

  it("renders an empty container when given neither title nor lines", () => {
    expect(card({})).toBe('<div class="battleframe-card"></div>');
  });

  it("appends a ruleset cssClass so a module can theme its own cards", () => {
    expect(card({ cssClass: "ft-fire-report", lines: [] })).toBe(
      '<div class="battleframe-card ft-fire-report"></div>'
    );
  });

  it("passes title and lines through verbatim (the CALLER escapes dynamic text)", () => {
    // card() is a container, not a sanitizer: a caller that forgets to escape gets
    // raw markup, exactly as its own hand-built wrapper would have.
    expect(card({ title: "<b>x</b>", lines: ["<i>y</i>"] })).toBe(
      '<div class="battleframe-card"><h3 class="battleframe-card__title"><b>x</b></h3><i>y</i></div>'
    );
  });
});

describe("chat.postCard", () => {
  it("creates a ChatMessage whose content is the rendered card, defaulting the speaker", async () => {
    const created: Record<string, unknown>[] = [];
    vi.stubGlobal("ChatMessage", {
      create: (data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve(data);
      },
      getSpeaker: () => ({ alias: "GM" })
    });
    await postCard({ title: "Hit", lines: ["<p>3 damage</p>"] });
    expect(created).toHaveLength(1);
    expect(created[0].content).toBe(card({ title: "Hit", lines: ["<p>3 damage</p>"] }));
    expect(created[0].speaker).toEqual({ alias: "GM" });
    expect(created[0].rolls).toBeUndefined();
  });

  it("attaches rolls only when supplied, and honours an explicit speaker", async () => {
    const created: Record<string, unknown>[] = [];
    vi.stubGlobal("ChatMessage", {
      create: (data: Record<string, unknown>) => {
        created.push(data);
        return Promise.resolve(data);
      },
      getSpeaker: () => ({ alias: "default" })
    });
    const roll = { total: 7 };
    await postCard({ lines: ["<p>x</p>"], speaker: { alias: "RNS Lion" }, rolls: [roll] });
    expect(created[0].speaker).toEqual({ alias: "RNS Lion" });
    expect(created[0].rolls).toEqual([roll]);
  });

  it("no-ops when ChatMessage is unavailable (the no-Foundry path)", async () => {
    vi.stubGlobal("ChatMessage", undefined);
    await expect(postCard({ title: "x" })).resolves.toBeUndefined();
  });
});

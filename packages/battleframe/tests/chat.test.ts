/**
 * The chat service: a neutral HTML-entity escaper for any module that builds
 * markup from user-editable strings (token names, notes). The engine already
 * needed it internally (hover panel) and a ruleset re-declared an identical copy
 * — engine-extraction scan #2, finding 4. Only the escaper is extracted; the
 * outcome-card builder stays a ruleset's until a second module posts chat.
 */

import { describe, expect, it } from "vitest";
import { createChatApi } from "../src/ui/chat";

const api = createChatApi();

describe("chat.escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(api.escapeHtml(`<img src="x" onerror='y'>&`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;"
    );
  });

  it("leaves ordinary text unchanged", () => {
    expect(api.escapeHtml("RNS Lion 3")).toBe("RNS Lion 3");
  });
});

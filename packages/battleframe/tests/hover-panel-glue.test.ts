import { describe, expect, it } from "vitest";
import { shouldRender, escapeHtml, buildPanelHtml } from "../src/ui/hover-panel";

describe("shouldRender", () => {
  const provider = { fields: [{ key: "a", label: "A" }] };
  it("no provider for the type -> false", () => {
    expect(shouldRender({ isGM: true }, { actor: { type: "x", isOwner: true } }, () => undefined, "ruleset")).toBe(false);
  });
  it("provider + GM + any mode -> true", () => {
    expect(shouldRender({ isGM: true }, { actor: { type: "x", isOwner: false } }, () => provider, "gm")).toBe(true);
  });
  it("provider + player + gm mode -> false", () => {
    expect(shouldRender({ isGM: false }, { actor: { type: "x", isOwner: true } }, () => provider, "gm")).toBe(false);
  });
  it("token with no actor -> false", () => {
    expect(shouldRender({ isGM: true }, { actor: null }, () => provider, "everyone")).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("neutralizes markup", () => {
    expect(escapeHtml(`<img src=x onerror="a">&'`)).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  });
});

describe("buildPanelHtml", () => {
  const up = (k: string) => k.toUpperCase(); // stand-in localizer
  it("escapes a malicious actor name", () => {
    const html = buildPanelHtml({ name: "<script>x</script>", rows: [], statuses: [] }, up);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("localizes field labels but not the name, and escapes values", () => {
    const html = buildPanelHtml(
      { name: "Bob", rows: [{ label: "hp", text: "<b>5</b>" }], statuses: [] },
      up,
    );
    expect(html).toContain("HP");            // label localized
    expect(html).toContain("Bob");           // name not localized
    expect(html).toContain("&lt;b&gt;5&lt;/b&gt;"); // value escaped
  });
});

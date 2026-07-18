import { describe, expect, it } from "vitest";
import { buildPanelModel } from "../src/ui/hover-panel-model";

const provider = {
  fields: [
    { key: "a", label: "Alpha" },
    { key: "b", label: "Beta", max: 3 },
  ],
};

describe("buildPanelModel", () => {
  it("renders the name and a row per field, with value/max when max is set", () => {
    const actor = { name: "Unit X", system: { a: 5, b: 1 }, statuses: new Set() };
    const model = buildPanelModel(actor, provider, () => undefined);
    expect(model.name).toBe("Unit X");
    expect(model.rows).toEqual([
      { label: "Alpha", text: "5" },
      { label: "Beta", text: "1/3" },
    ]);
  });
  it("renders a missing field as an em dash, never throwing", () => {
    const actor = { name: "Y", system: {}, statuses: new Set() };
    const model = buildPanelModel(actor, provider, () => undefined);
    expect(model.rows.map((r) => r.text)).toEqual(["—", "—/3"]);
  });
  it("maps active statuses to icon + label via the resolver", () => {
    const actor = { name: "Z", system: { a: 1, b: 1 }, statuses: new Set(["dead"]) };
    const resolve = (id: string) => (id === "dead" ? { img: "icons/svg/skull.svg", label: "Defeated" } : undefined);
    const model = buildPanelModel(actor, provider, resolve);
    expect(model.statuses).toEqual([{ id: "dead", img: "icons/svg/skull.svg", label: "Defeated" }]);
  });
  it("omits statuses with no resolvable icon", () => {
    const actor = { name: "Z", system: {}, statuses: new Set(["mystery"]) };
    const model = buildPanelModel(actor, provider, () => undefined);
    expect(model.statuses).toEqual([]);
  });
});

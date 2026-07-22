import { describe, expect, it } from "vitest";
import { defaultWeapon, addWeaponTo, removeWeaponAt } from "../src/sheets/weapon-edit";

describe("defaultWeapon", () => {
  it("is a fresh beam mount with no arcs, not destroyed/spent", () => {
    expect(defaultWeapon()).toEqual({
      kind: "beam",
      weaponClass: 1,
      arcs: [],
      destroyed: false,
      spent: false
    });
  });
});

describe("addWeaponTo", () => {
  it("appends a default weapon without mutating the input", () => {
    const weapons = [{ kind: "torpedo", arcs: ["F"], destroyed: false, spent: false }];
    const next = addWeaponTo(weapons);
    expect(next).toHaveLength(2);
    expect(next[1].kind).toBe("beam");
    expect(weapons).toHaveLength(1); // original untouched
  });

  it("starts an empty list", () => {
    expect(addWeaponTo(undefined)).toHaveLength(1);
  });
});

describe("removeWeaponAt", () => {
  it("removes the weapon at the index without mutating the input", () => {
    const weapons = [
      { kind: "beam", arcs: [] },
      { kind: "torpedo", arcs: ["F"] },
      { kind: "submunition", arcs: [] }
    ];
    const next = removeWeaponAt(weapons, 1);
    expect(next.map((w) => w.kind)).toEqual(["beam", "submunition"]);
    expect(weapons).toHaveLength(3);
  });

  it("ignores an out-of-range index", () => {
    const weapons = [{ kind: "beam", arcs: [] }];
    expect(removeWeaponAt(weapons, 5)).toHaveLength(1);
    expect(removeWeaponAt(weapons, -1)).toHaveLength(1);
  });
});

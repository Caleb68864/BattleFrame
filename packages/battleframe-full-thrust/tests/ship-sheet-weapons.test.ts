import { describe, expect, it, vi } from "vitest";
import { prepareWeaponRows, onAddWeapon, onRemoveWeapon } from "../src/sheets/ship-sheet";

describe("prepareWeaponRows", () => {
  it("marks the selected kind and arcs for each weapon", () => {
    const rows = prepareWeaponRows([
      { kind: "torpedo", weaponClass: null, arcs: ["F", "FS"], destroyed: false, spent: false }
    ]) as any[];
    expect(rows[0].index).toBe(0);
    expect(rows[0].kinds.find((k: any) => k.value === "torpedo").selected).toBe(true);
    expect(rows[0].kinds.find((k: any) => k.value === "beam").selected).toBe(false);
    expect(rows[0].arcs.find((a: any) => a.value === "F").selected).toBe(true);
    expect(rows[0].arcs.find((a: any) => a.value === "A").selected).toBe(false);
  });
});

describe("weapon action handlers", () => {
  function fakeApp(weapons: any[]) {
    const updates: any[] = [];
    return {
      updates,
      actor: {
        system: { weapons },
        update: (data: any) => {
          updates.push(data);
          return Promise.resolve();
        }
      }
    };
  }

  it("onAddWeapon appends a default beam", async () => {
    const app = fakeApp([{ kind: "torpedo", arcs: ["F"], destroyed: false, spent: false }]);
    await onAddWeapon.call(app);
    const written = app.updates[0]["system.weapons"];
    expect(written).toHaveLength(2);
    expect(written[1].kind).toBe("beam");
  });

  it("onRemoveWeapon drops the weapon at the button's index", async () => {
    const app = fakeApp([{ kind: "beam", arcs: [] }, { kind: "torpedo", arcs: ["F"] }]);
    await onRemoveWeapon.call(app, {}, { dataset: { index: "0" } });
    const written = app.updates[0]["system.weapons"];
    expect(written).toHaveLength(1);
    expect(written[0].kind).toBe("torpedo");
  });
});

import { describe, expect, it } from "vitest";
import { weaponTypeIcon } from "../src/ship/weapon-icons";
import { WEAPON_KINDS, MODULE_ID } from "../src/constants";

describe("weaponTypeIcon", () => {
  it("maps each weapon kind that has a good fit to a shipped icon path", () => {
    expect(weaponTypeIcon("beam")).toBe(`modules/${MODULE_ID}/icons/beam.svg`);
    expect(weaponTypeIcon("torpedo")).toBe(`modules/${MODULE_ID}/icons/rocket.svg`);
    expect(weaponTypeIcon("salvo")).toBe(`modules/${MODULE_ID}/icons/missiles.svg`);
    expect(weaponTypeIcon("needle")).toBe(`modules/${MODULE_ID}/icons/system.svg`);
    expect(weaponTypeIcon("submunition")).toBe(`modules/${MODULE_ID}/icons/explosion.svg`);
  });

  it("returns undefined for a kind with no sensible icon fit (kgun)", () => {
    expect(weaponTypeIcon("kgun")).toBeUndefined();
  });

  it("returns undefined for an unknown type", () => {
    expect(weaponTypeIcon("phaser")).toBeUndefined();
    expect(weaponTypeIcon("")).toBeUndefined();
  });

  it("only ever points at a shipped icon file for known kinds", () => {
    for (const kind of WEAPON_KINDS) {
      const icon = weaponTypeIcon(kind);
      if (icon !== undefined) {
        expect(icon.startsWith(`modules/${MODULE_ID}/icons/`)).toBe(true);
        expect(icon.endsWith(".svg")).toBe(true);
      }
    }
  });
});

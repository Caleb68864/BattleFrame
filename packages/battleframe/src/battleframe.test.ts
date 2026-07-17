import { describe, expect, it } from "vitest";
import { SYSTEM_ID } from "./constants";

describe("battleframe constants", () => {
  it("declares the system id", () => {
    expect(SYSTEM_ID).toBe("battleframe");
  });
});

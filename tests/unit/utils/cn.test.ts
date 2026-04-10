import { describe, expect, it } from "vitest";

import { cn } from "@/utils";

describe("cn", () => {
  it("joins truthy classes with spaces", () => {
    expect(cn("btn", "btn-primary", "w-full")).toBe("btn btn-primary w-full");
  });

  it("filters undefined and false values", () => {
    expect(cn("base", undefined, false, "active")).toBe("base active");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(undefined, false)).toBe("");
  });
});
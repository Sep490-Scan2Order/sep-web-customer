import { describe, expect, it } from "vitest";

import { extractRestaurantPath } from "@/constants/routes";

describe("extractRestaurantPath", () => {
  it("returns pathname when profileUrl is absolute url", () => {
    expect(extractRestaurantPath("https://example.com/restaurants/s2o")).toBe(
      "/restaurants/s2o"
    );
  });

  it("adds leading slash for non-url input", () => {
    expect(extractRestaurantPath("restaurants/s2o")).toBe("/restaurants/s2o");
  });

  it("returns null for null input", () => {
    expect(extractRestaurantPath(null)).toBeNull();
  });
});
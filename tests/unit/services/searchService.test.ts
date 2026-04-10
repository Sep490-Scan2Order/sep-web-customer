import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  api: {
    get: getMock,
  },
}));

import { searchHybrid } from "@/services/searchService";

describe("searchHybrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds request query with provided coordinates", async () => {
    const mockResult = [{ restaurantId: 1, restaurantName: "R1" }];
    getMock.mockResolvedValueOnce({
      data: {
        isSuccess: true,
        message: "ok",
        data: mockResult,
      },
    });

    const result = await searchHybrid({
      keyword: "pho",
      latitude: 10.1,
      longitude: 106.2,
      radiusKm: 5,
      topK: 7,
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith(
      "/Search/hybrid?Keyword=pho&Latitude=10.1&Longitude=106.2&RadiusKm=5&TopK=7"
    );
    expect(result).toEqual(mockResult);
  });

  it("uses default radius/topK and returns empty list when data is missing", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        isSuccess: true,
        message: "ok",
        data: null,
      },
    });

    const result = await searchHybrid({ keyword: "bun bo" });

    expect(getMock).toHaveBeenCalledWith(
      "/Search/hybrid?Keyword=bun+bo&RadiusKm=20&TopK=20"
    );
    expect(result).toEqual([]);
  });
});
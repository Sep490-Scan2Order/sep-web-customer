import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  api: {
    get: getMock,
  },
}));

import {
  getNearbyRestaurants,
  getRestaurantById,
  getRestaurantBySlug,
  getRestaurantSuggestions,
  getRestaurantsAll,
} from "@/services/restaurantService";

describe("restaurantService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getRestaurantById", () => {
    it("returns null when id is not numeric", async () => {
      await expect(getRestaurantById("abc")).resolves.toBeNull();
    });

    it("returns null when API responds 404", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        status: 404,
        ok: false,
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(getRestaurantById("12")).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws wrapped error when API responds non-404 error", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        status: 500,
        ok: false,
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(getRestaurantById("12")).rejects.toThrow("[getRestaurantById]");
    });
  });

  describe("getRestaurantBySlug", () => {
    it("returns null for blank slug", async () => {
      await expect(getRestaurantBySlug("   ")).resolves.toBeNull();
    });

    it("fills missing open/close time by fetching fallback data from getRestaurantById", async () => {
      const slugPayload = {
        isSuccess: true,
        message: "ok",
        data: {
          id: 88,
          tenantId: "t1",
          restaurantName: "Slug Restaurant",
          address: "addr",
          longitude: 106,
          latitude: 10,
          image: "img",
          phone: null,
          slug: "slug-restaurant",
          description: null,
          profileUrl: null,
          qrMenu: null,
          isActive: true,
          isOpened: true,
          isReceivingOrders: true,
          totalOrder: 10,
          createdAt: "2024-01-01",
          distanceKm: 0.5,
          openTime: null,
          closeTime: null,
          minCashAmount: null,
        },
      };

      const idPayload = {
        isSuccess: true,
        message: "ok",
        data: {
          ...slugPayload.data,
          openTime: "08:00",
          closeTime: "21:00",
          minCashAmount: 50000,
        },
      };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => slugPayload,
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => idPayload,
        });

      vi.stubGlobal("fetch", fetchMock);

      const result = await getRestaurantBySlug("slug-restaurant");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result?.openTime).toBe("08:00");
      expect(result?.closeTime).toBe("21:00");
      expect(result?.minCashAmount).toBe(50000);
    });
  });

  describe("client fetch methods", () => {
    it("maps nearby restaurants into UI model", async () => {
      getMock.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          message: "ok",
          data: [
            {
              id: 1,
              restaurantName: "Quan Pho",
              image: "",
              description: null,
              distanceKm: 1.234,
              address: "HCM",
            },
          ],
        },
      });

      const result = await getNearbyRestaurants({ latitude: 10, longitude: 106 });

      expect(getMock).toHaveBeenCalledWith("/Restaurant/nearby", {
        params: {
          latitude: 10,
          longitude: 106,
          radiusKm: 5,
          limit: 10,
        },
      });
      expect(result[0]).toMatchObject({
        id: "1",
        name: "Quan Pho",
        image: "/placeholder-restaurant.jpg",
        cuisineType: "Nhà hàng",
        distance: "~ 1.23 km",
        address: "HCM",
      });
    });

    it("maps suggested restaurants and omits distance when distanceKm is null", async () => {
      getMock.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          message: "ok",
          data: [
            {
              id: 61,
              tenantId: "t1",
              restaurantName: "Kichi Kichi",
              address: "56 Lê Văn Việt",
              longitude: 106.77,
              latitude: 10.84,
              image: "https://example.com/img.png",
              phone: null,
              slug: "kichi",
              description: "�u băng chuyền",
              profileUrl: null,
              qrMenu: null,
              isActive: true,
              isOpened: true,
              isReceivingOrders: true,
              totalOrder: 0,
              createdAt: "2026-03-03T13:36:11.585515Z",
              distanceKm: null,
              openTime: "10:00",
              closeTime: "20:00",
              minCashAmount: 0,
            },
          ],
        },
      });

      const result = await getRestaurantSuggestions();

      expect(getMock).toHaveBeenCalledWith("/Restaurant/suggestions", undefined);
      expect(result[0]).toMatchObject({
        id: "61",
        renderKey: "suggestion-61",
        name: "Kichi Kichi",
        cuisineType: "Hotpot conveyor",
        address: "56 Lê Văn Việt",
      });
      expect(result[0].distance).toBeUndefined();
    });

    it("returns fallback paged result when API data is null", async () => {
      getMock.mockResolvedValueOnce({
        data: {
          isSuccess: true,
          message: "ok",
          data: null,
        },
      });

      const result = await getRestaurantsAll(2, 50, { latitude: 10, longitude: 106 }, " pho ");

      expect(getMock).toHaveBeenCalledWith("/Restaurant/all", {
        params: {
          page: 2,
          pageSize: 50,
          latitude: 10,
          longitude: 106,
          keyword: "pho",
        },
      });
      expect(result).toEqual({
        items: [],
        page: 1,
        pageSize: 50,
        totalCount: 0,
        hasNextPage: false,
      });
    });
  });
});
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
  getMenuRestaurantTemplateByRestaurantId,
  getRestaurantGroupedMenu,
  getRestaurantMenuByDataMapping,
  parseMenuLayoutConfig,
} from "@/services/menuRestaurantTemplateService";

describe("menuRestaurantTemplateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parseMenuLayoutConfig returns null for invalid json and payload without slots", () => {
    expect(parseMenuLayoutConfig("{invalid}")).toBeNull();
    expect(parseMenuLayoutConfig(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it("parseMenuLayoutConfig returns parsed config when slots exists", () => {
    const config = { version: 1, slots: [{ key: "a" }] };
    expect(parseMenuLayoutConfig(JSON.stringify(config))).toEqual(config);
  });

  it("getMenuRestaurantTemplateByRestaurantId handles invalid id and 404", async () => {
    await expect(getMenuRestaurantTemplateByRestaurantId(0)).resolves.toBeNull();

    getMock.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(getMenuRestaurantTemplateByRestaurantId(1)).resolves.toBeNull();
  });

  it("getMenuRestaurantTemplateByRestaurantId throws non-404 errors", async () => {
    getMock.mockRejectedValueOnce({ response: { status: 500 } });
    await expect(getMenuRestaurantTemplateByRestaurantId(1)).rejects.toEqual({
      response: { status: 500 },
    });
  });

  it("getRestaurantGroupedMenu falls back across endpoints until one succeeds", async () => {
    getMock
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          isSuccess: true,
          message: "ok",
          data: [
            {
              categoryId: 11,
              categoryName: "Mon Chinh",
              dishes: [
                {
                  dishId: 101,
                  dishName: "Com suon",
                  price: 45000,
                  description: "",
                  imageUrl: "img",
                  isSoldOut: false,
                  discountedPrice: "39000",
                  promoType: "1",
                  dishAvailabilityStock: "12",
                },
              ],
            },
          ],
        },
      });

    const result = await getRestaurantGroupedMenu(8);

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(result.sections.length).toBe(1);
    expect(result.sections[0].id).toBe("11");
    expect(result.sections[0].dishes[0].name).toBe("Com suon");
  });

  it("getRestaurantMenuByDataMapping normalizes categories and dishes", async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          data: [
            { categoryId: 1, categoryName: "Mon Nuoc" },
            { id: "2", name: "Mon Kho" },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              dishId: 10,
              dishName: "Pho",
              price: "45000",
              description: "hot",
              categoryId: 1,
            },
            {
              id: "11",
              name: "Tra Da",
              basePrice: 5000,
              shortDescription: "cold",
            },
          ],
        },
      });

    const result = await getRestaurantMenuByDataMapping(
      22,
      {
        categories: { source: "category/custom", displayField: "categoryName" },
        dishes: { source: "dish/custom" },
      },
      "tenant-1"
    );

    expect(getMock).toHaveBeenNthCalledWith(1, "category/custom", {
      params: { restaurantId: 22, restaurantID: 22, restaurant_id: 22 },
    });
    expect(getMock).toHaveBeenNthCalledWith(2, "dish/custom", {
      params: { restaurantId: 22, restaurantID: 22, restaurant_id: 22 },
    });
    expect(result.sections.length).toBe(2);
    expect(result.sections[0].dishes[0].name).toBe("Pho");
    expect(result.ungroupedDishes.length).toBe(1);
    expect(result.ungroupedDishes[0].name).toBe("Tra Da");
  });
});
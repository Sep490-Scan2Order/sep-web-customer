import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  api: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
}));

import {
  addToCart,
  CART_DATA_STORAGE_KEY,
  CART_ID_STORAGE_KEY,
  clearCartCache,
  clearPendingBankTransfer,
  getAvailablePromotions,
  getCustomerActiveOrders,
  getCustomerActiveOrdersAllRestaurants,
  loadCartByCartId,
  loadCartCache,
  loadPendingBankTransfer,
  saveCartCache,
  savePendingBankTransfer,
  updateCartItem,
} from "@/services/orderCustomerService";

describe("orderCustomerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("saves and loads cart cache in v1 format", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const cart = {
      cartId: "cart-1",
      restaurantId: 7,
      totalAmount: 120000,
      items: [],
    };

    saveCartCache(7, cart);
    const loaded = loadCartCache(7);

    expect(loaded).toEqual(cart);
    expect(window.localStorage.getItem(CART_ID_STORAGE_KEY(7))).toBe("cart-1");
    nowSpy.mockRestore();
  });

  it("expires cart cache by TTL and removes persisted keys", () => {
    window.localStorage.setItem(CART_ID_STORAGE_KEY(8), "cart-2");
    window.localStorage.setItem(
      CART_DATA_STORAGE_KEY("cart-2"),
      JSON.stringify({
        v: 1,
        savedAt: 1000,
        cart: { cartId: "cart-2", restaurantId: 8, totalAmount: 1, items: [] },
      })
    );

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000 + 60 * 60 * 1000 + 1);
    const loaded = loadCartCache(8);

    expect(loaded).toBeNull();
    expect(window.localStorage.getItem(CART_ID_STORAGE_KEY(8))).toBeNull();
    expect(window.localStorage.getItem(CART_DATA_STORAGE_KEY("cart-2"))).toBeNull();
    nowSpy.mockRestore();
  });

  it("loadCartByCartId removes legacy cache payload", () => {
    window.localStorage.setItem(
      CART_DATA_STORAGE_KEY("legacy-cart"),
      JSON.stringify({ cartId: "legacy-cart", restaurantId: 9, totalAmount: 1000, items: [] })
    );

    const loaded = loadCartByCartId("legacy-cart");

    expect(loaded).toBeNull();
    expect(window.localStorage.getItem(CART_DATA_STORAGE_KEY("legacy-cart"))).toBeNull();
  });

  it("clearCartCache removes both cart id and data keys", () => {
    window.localStorage.setItem(CART_ID_STORAGE_KEY(10), "cart-10");
    window.localStorage.setItem(CART_DATA_STORAGE_KEY("cart-10"), "{}");

    clearCartCache(10);

    expect(window.localStorage.getItem(CART_ID_STORAGE_KEY(10))).toBeNull();
    expect(window.localStorage.getItem(CART_DATA_STORAGE_KEY("cart-10"))).toBeNull();
  });

  it("saves and expires pending bank transfer session", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(2_000_000);
    savePendingBankTransfer({
      orderId: "order-1",
      qrUrl: "https://qrcode",
      paymentCode: "PMT001",
      totalAmount: 200000,
      restaurantName: "R1",
      qrCodeBase64: null,
      restaurantId: "1",
      restaurantSlug: "r1",
      checkoutUrl: "/checkout",
    });

    expect(loadPendingBankTransfer()?.orderId).toBe("order-1");

    nowSpy.mockReturnValue(2_000_000 + 15 * 60 * 1000 + 1);
    expect(loadPendingBankTransfer()).toBeNull();
    nowSpy.mockRestore();
  });

  it("clears pending bank transfer session", () => {
    savePendingBankTransfer({
      orderId: "order-2",
      qrUrl: null,
      paymentCode: "PMT002",
      totalAmount: 100000,
      restaurantName: "R2",
      qrCodeBase64: null,
      restaurantId: "2",
      restaurantSlug: "r2",
      checkoutUrl: "/checkout-2",
    });

    clearPendingBankTransfer();
    expect(loadPendingBankTransfer()).toBeNull();
  });

  it("addToCart and updateCartItem return data on success", async () => {
    const cart = { cartId: "c1", restaurantId: 1, totalAmount: 10, items: [] };
    postMock.mockResolvedValueOnce({ data: { isSuccess: true, message: "ok", data: cart } });
    putMock.mockResolvedValueOnce({ data: { isSuccess: true, message: "ok", data: cart } });

    await expect(addToCart({ restaurantId: 1, dishId: 2, quantity: 1 })).resolves.toEqual(cart);
    await expect(updateCartItem({ cartId: "c1", dishId: 2, newQuantity: 3 })).resolves.toEqual(cart);
  });

  it("addToCart throws API message when failed", async () => {
    postMock.mockResolvedValueOnce({
      data: { isSuccess: false, message: "Loi them gio", data: null },
    });

    await expect(addToCart({ restaurantId: 1, dishId: 2, quantity: 1 })).rejects.toThrow(
      "Loi them gio"
    );
  });

  it("returns promotions from API when success and fallback when API fails", async () => {
    postMock
      .mockResolvedValueOnce({
        data: {
          isSuccess: true,
          message: "ok",
          data: [{ id: 99, name: "Promo 99" }],
        },
      })
      .mockRejectedValueOnce(new Error("network"));

    const apiResult = await getAvailablePromotions({ restaurantId: 5, orderTotal: 76000 });
    const fallbackResult = await getAvailablePromotions({ restaurantId: 5, orderTotal: 76000 });

    expect(apiResult).toEqual([{ id: 99, name: "Promo 99" }]);
    expect(Array.isArray(fallbackResult)).toBe(true);
    expect(fallbackResult.length).toBeGreaterThan(0);
    expect(fallbackResult[0].restaurantIds).toContain(5);
  });

  it("trims phone for order lookup and returns [] for non-array data", async () => {
    getMock
      .mockResolvedValueOnce({ data: { isSuccess: true, message: "ok", data: [{ orderId: "1" }] } })
      .mockResolvedValueOnce({ data: { isSuccess: true, message: "ok", data: null } });

    const byRestaurant = await getCustomerActiveOrders({
      restaurantId: 12,
      phoneNumber: " 0909 ",
    });
    const allRestaurants = await getCustomerActiveOrdersAllRestaurants(" 0911 ");

    expect(getMock).toHaveBeenNthCalledWith(1, "/Order/customer/orders/active", {
      params: { restaurantId: 12, phone: "0909" },
      _skipAuth: true,
    });
    expect(getMock).toHaveBeenNthCalledWith(2, "/Order/customer/orders/active/all-restaurants", {
      params: { phone: "0911" },
      _skipAuth: true,
    });
    expect(byRestaurant).toEqual([{ orderId: "1" }]);
    expect(allRestaurants).toEqual([]);
  });
});
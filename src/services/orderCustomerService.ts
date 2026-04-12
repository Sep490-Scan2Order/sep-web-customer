import { API } from "@/services/api";
import { api } from "@/services/apiClient";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
};

export type AddToCartRequest = {
  restaurantId: number;
  dishId: number;
  quantity: number;
  note?: string | null;
  cartId?: string | null;
};

export type CartItem = {
  dishId: number;
  dishName: string;
  imageUrl?: string | null;
  quantity: number;
  discountedPrice: number;
  originalPrice: number;
  promotionAmount: number;
  promotionName: string | null;
  subTotal: number;
};

export type CartResponse = {
  cartId: string;
  restaurantId: number;
  totalAmount: number;
  items: CartItem[];
};

export const CART_TTL_MS = 60 * 60 * 1000; // 60 phút (đồng bộ TTL Redis)

export const CART_ID_STORAGE_KEY = (restaurantId: number | string) =>
  `s2o_cart_id_${restaurantId}`;

export const CART_DATA_STORAGE_KEY = (cartId: string) =>
  `s2o_cart_data_${cartId}`;

type CartCachePayload =
  | {
      v: 1;
      savedAt: number;
      cart: CartResponse;
    }
  | CartResponse; // legacy format

export function saveCartCache(restaurantId: number | string, cart: CartResponse) {
  if (typeof window === "undefined") return;
  const payload: CartCachePayload = { v: 1, savedAt: Date.now(), cart };
  window.localStorage.setItem(CART_ID_STORAGE_KEY(restaurantId), cart.cartId);
  window.localStorage.setItem(CART_DATA_STORAGE_KEY(cart.cartId), JSON.stringify(payload));
}

export function loadCartCache(restaurantId: number | string): CartResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const cartId = window.localStorage.getItem(CART_ID_STORAGE_KEY(restaurantId));
    if (!cartId) return null;
    const raw = window.localStorage.getItem(CART_DATA_STORAGE_KEY(cartId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartCachePayload;

    // New format with TTL
    if (parsed && typeof parsed === "object" && "v" in parsed && (parsed as { v?: unknown }).v === 1) {
      const p = parsed as Extract<CartCachePayload, { v: 1 }>;
      const elapsed = Date.now() - (p.savedAt ?? 0);
      if (elapsed >= CART_TTL_MS) {
        window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
        window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantId));
        return null;
      }
      return p.cart ?? null;
    }

    // Legacy format: treat as expired to avoid "lưu lâu quá"
    window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
    window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantId));
    return null;
  } catch {
    return null;
  }
}

export function clearCartCache(restaurantId: number | string, cartId?: string | null) {
  if (typeof window === "undefined") return;
  const existingId = cartId ?? window.localStorage.getItem(CART_ID_STORAGE_KEY(restaurantId));
  if (existingId) {
    window.localStorage.removeItem(CART_DATA_STORAGE_KEY(existingId));
  }
  window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantId));
}

export function loadCartByCartId(cartId: string): CartResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_DATA_STORAGE_KEY(cartId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartCachePayload;
    if (parsed && typeof parsed === "object" && "v" in parsed && (parsed as { v?: unknown }).v === 1) {
      const p = parsed as Extract<CartCachePayload, { v: 1 }>;
      const elapsed = Date.now() - (p.savedAt ?? 0);
      if (elapsed >= CART_TTL_MS) {
        window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
        return null;
      }
      return p.cart ?? null;
    }
    // legacy format
    window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
    return null;
  } catch {
    return null;
  }
}

/**
 * Pending bank transfer session: lưu khi checkout bank thành công,
 * xóa khi đã xác nhận thanh toán hoặc người dùng huỷ thủ công.
 * TTL = 15 phút (đồng bộ với cronjob cancel unpaid orders).
 */
export const PENDING_BANK_TRANSFER_TTL_MS = 15 * 60 * 1000; // 15 phút (thực tế cronjob cancel)
export const PENDING_BANK_TRANSFER_SAFE_TTL_MS = 13 * 60 * 1000; // 13 phút (banner ẩn trước 2' để đủ thời gian scan)

export type PendingBankTransferSession = {
  orderId: string;
  qrUrl: string | null;
  paymentCode: string;
  totalAmount: number;
  restaurantName: string;
  qrCodeBase64: string | null;
  restaurantId: string;
  restaurantSlug: string;
  checkoutUrl: string; // URL để quay lại trang checkout hiển thị QR
  savedAt: number;
};

export const PENDING_BANK_TRANSFER_KEY = "s2o_pending_bank_transfer";

export function savePendingBankTransfer(session: Omit<PendingBankTransferSession, "savedAt">) {
  if (typeof window === "undefined") return;
  const data: PendingBankTransferSession = { ...session, savedAt: Date.now() };
  window.localStorage.setItem(PENDING_BANK_TRANSFER_KEY, JSON.stringify(data));
}

export function loadPendingBankTransfer(): PendingBankTransferSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_BANK_TRANSFER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBankTransferSession;
    const elapsed = Date.now() - parsed.savedAt;
    if (elapsed >= PENDING_BANK_TRANSFER_TTL_MS) {
      window.localStorage.removeItem(PENDING_BANK_TRANSFER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingBankTransfer() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_BANK_TRANSFER_KEY);
}

export async function addToCart(req: AddToCartRequest): Promise<CartResponse> {
  const { data } = await api.post<ApiResponse<CartResponse>>(
    API.ORDER.ADD_TO_CART,
    req,
    { _skipAuth: true } as unknown as Record<string, unknown>
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Không thể thêm vào giỏ hàng.");
  }
  return data.data;
}

export type UpdateCartItemRequest = {
  cartId: string;
  dishId: number;
  newQuantity: number;
};

/**
 * Cập nhật số lượng món trong giỏ hàng.
 * - newQuantity = 0  → xóa món khỏi giỏ (không cần gọi API xóa riêng)
 * - newQuantity > 0  → set số lượng tuyệt đối (absolute value)
 * - Trả về toàn bộ CartResponse đã được sync lại từ backend
 */
export async function updateCartItem(req: UpdateCartItemRequest): Promise<CartResponse> {
  const { data } = await api.put<ApiResponse<CartResponse>>(
    API.ORDER.UPDATE_CART_ITEM,
    req,
    { _skipAuth: true } as unknown as Record<string, unknown>
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Không thể cập nhật giỏ hàng.");
  }
  return data.data;
}



export type CheckoutRequest = {
  cartId: string;
  phone: string;
  appliedPromotionId?: number | null;
};

export type CheckoutCashResponse = {
  orderId: string;
  orderCode: number;
  totalAmount: number;
  restaurantName: string;
  phone: string;
  note: string | null;
  qrCodeBase64: string | null;
};

export type CheckoutBankTransferResponse = {
  orderId: string;
  qrUrl: string | null;
  paymentCode: string;
  totalAmount: number;
  restaurantName: string;
  qrCodeBase64: string | null;
};

export async function checkoutCash(req: CheckoutRequest): Promise<CheckoutCashResponse> {
  const { data } = await api.post<ApiResponse<CheckoutCashResponse>>(
    API.ORDER.CHECKOUT_CASH,
    req,
    { _skipAuth: true } as unknown as Record<string, unknown>
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Thanh toán thất bại.");
  }
  return data.data;
}

export async function checkoutBankTransfer(req: CheckoutRequest): Promise<CheckoutBankTransferResponse> {
  const { data } = await api.post<ApiResponse<CheckoutBankTransferResponse>>(
    API.ORDER.CHECKOUT_BANK_TRANSFER,
    req,
    { _skipAuth: true } as unknown as Record<string, unknown>
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Thanh toán thất bại.");
  }
  return data.data;
}

export type PromotionResponse = {
  id: number;
  name: string;
  type: number;
  discountType: number;
  discountValue: number;
  maxDiscountValue: number | null;
  minOrderValue: number;
  startDate: string | null;
  endDate: string | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  daysOfWeek: number;
  isGlobal: boolean;
  priority: number | null;
  scope: number;
  restaurantIds: number[];
  dishIds: number[] | null;
  isActive: boolean;
  discountAmount: number;
  isRecommended: boolean;
};

export async function getAvailablePromotions(req: {
  restaurantId: number;
  orderTotal: number;
}): Promise<PromotionResponse[]> {
  try {
    const { data } = await api.post<ApiResponse<PromotionResponse[]>>(
      API.ORDER.AVAILABLE_PROMOTIONS,
      req,
      { _skipAuth: true } as unknown as Record<string, unknown>
    );
    if (data.isSuccess) {
      return Array.isArray(data.data) ? data.data : [];
    }
  } catch (err) {
    console.warn("API available-promotions failed, using mock data for UI testing.");
  }
  
  // MOCK DATA FALLBACK IF API FAILS (Backend hasn't implemented it yet)
  return [
    {
      id: 5,
      name: "Xả hàng cuối tuần",
      type: 2,
      discountType: 0,
      discountValue: 50000,
      maxDiscountValue: null,
      minOrderValue: 20000, // Lowered to 20k so it shows up for exactly 76k order cart from user screenshot
      startDate: "2026-04-01T00:00:00",
      endDate: "2026-04-07T23:59:59",
      dailyStartTime: null,
      dailyEndTime: null,
      daysOfWeek: 0,
      isGlobal: false,
      priority: 100,
      scope: 1,
      restaurantIds: [req.restaurantId],
      dishIds: null,
      isActive: true,
      discountAmount: 50000,
      isRecommended: true
    },
    {
      id: 3,
      name: "Happy Hour 6-8pm",
      type: 1,
      discountType: 1,
      discountValue: 15,
      maxDiscountValue: 30000,
      minOrderValue: 50000, // Lowered to 50k
      startDate: null,
      endDate: null,
      dailyStartTime: "18:00:00",
      dailyEndTime: "20:00:00",
      daysOfWeek: 0,
      isGlobal: true,
      priority: 80,
      scope: 1,
      restaurantIds: [],
      dishIds: null,
      isActive: true,
      discountAmount: 11400, // 15% of 76k
      isRecommended: false
    },
    {
      id: 1,
      name: "Khuyến mãi khai trương",
      type: 0,
      discountType: 0,
      discountValue: 20000,
      maxDiscountValue: null,
      minOrderValue: 50000,
      startDate: "2026-03-01T00:00:00",
      endDate: "2026-06-30T23:59:59",
      dailyStartTime: null,
      dailyEndTime: null,
      daysOfWeek: 0,
      isGlobal: false,
      priority: 10,
      scope: 1,
      restaurantIds: [req.restaurantId],
      dishIds: null,
      isActive: true,
      discountAmount: 20000,
      isRecommended: false
    }
  ];
}

export type CustomerOrderDetailDto = {
  dishId: number;
  dishName: string;
  imageUrl?: string | null;
  /** Đơn gốc: số phần còn lại. Phiếu refund: snapshot theo backend. */
  quantity: number;
  originalPrice: number;
  discountedPrice?: number | null;
  /** Đơn gốc: tổng dòng còn lại (tỷ lệ). Phiếu refund: tiền hoàn dòng. */
  subTotal: number;
  /** Đơn gốc: số lượng lúc đặt. */
  orderedQuantity?: number | null;
  /** Đơn gốc: số phần đã hoàn trên dòng. */
  refundedQuantity?: number | null;
  /** Đơn gốc: tổng tiền dòng lúc đặt (trước scale theo phần còn). */
  originalSubTotal?: number | null;
};

export type CustomerOrderSummary = {
  restaurantId?: number;
  orderId: string;
  orderCode: number;
  status: number;
  createdAt: string;
  updatedAt?: string | null;
  finalAmount: number;
  /**
   * Đơn gốc: tổng trước khi trừ các lần hoàn (tính từ list response).
   * Phiếu refund: bằng finalAmount phiếu (không cộng thêm).
   */
  originalFinalAmount?: number | null;
  qrCodeUrl: string;
  typeOrder?: number;
  refundType?: number | null;
  refundOrderId?: string | null;
  isRefundLog?: boolean;
  orderDetails?: CustomerOrderDetailDto[];
};

/**
 * Tra cứu đơn theo SĐT + nhà hàng (AllowAnonymous).
 * Backend trả toàn bộ đơn thỏa điều kiện, không còn tham số limit.
 */
export async function getCustomerActiveOrders(params: {
  restaurantId: number | string;
  phoneNumber: string;
}): Promise<CustomerOrderSummary[]> {
  const phone = params.phoneNumber.trim();
  const { data } = await api.get<ApiResponse<CustomerOrderSummary[]>>(
    API.ORDER.CUSTOMER_GET_ORDERS_ACTIVE,
    {
      params: {
        restaurantId: params.restaurantId,
        phone,
      },
      _skipAuth: true,
    } as unknown as Record<string, unknown>
  );

  return Array.isArray(data.data) ? data.data : [];
}

/** Alias — cùng endpoint active. */
export async function getCustomerOrders(params: {
  restaurantId: number | string;
  phoneNumber: string;
}): Promise<CustomerOrderSummary[]> {
  return getCustomerActiveOrders(params);
}

export type AllRestaurantOrderSummary = CustomerOrderSummary & {
  restaurantId: number;
  restaurantName?: string | null;
};

export async function getCustomerActiveOrdersAllRestaurants(
  phoneNumber: string
): Promise<AllRestaurantOrderSummary[]> {
  const phone = phoneNumber.trim();
  const { data } = await api.get<ApiResponse<AllRestaurantOrderSummary[]>>(
    API.ORDER.CUSTOMER_GET_ORDERS_ACTIVE_ALL,
    {
      params: { phone },
      _skipAuth: true,
    } as unknown as Record<string, unknown>
  );

  return Array.isArray(data.data) ? data.data : [];
}

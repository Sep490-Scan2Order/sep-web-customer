"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  QrCode,
  ShoppingCart,
  Ticket,
  Tag,
  Clock,
  Flame,
  CalendarDays,
  Utensils,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/ui/common";
import { ROUTES } from "@/constants/routes";
import {
  addToCart,
  CART_DATA_STORAGE_KEY,
  clearCartCache,
  checkoutBankTransfer,
  getCustomerActiveOrders,
  getAvailablePromotions,
  getCartRecommendations,
  updateCartItem,
  PENDING_BANK_TRANSFER_TTL_MS,
  savePendingBankTransfer,
  clearPendingBankTransfer,
  loadCartByCartId,
  saveCartCache,
  type CartItem,
  type CartResponse,
  type CheckoutBankTransferResponse,
  type PromotionResponse,
  type RecommendedDish,
} from "@/services/orderCustomerService";
import { getRestaurantGroupedMenu } from "@/services/menuRestaurantTemplateService";
import { toast } from "react-toastify";
import type { RestaurantMenuData } from "@/types";
import { useOrderStatusSignalR } from "@/hooks/useOrderStatusSignalR";

function buildDishImageUrlById(
  menu: RestaurantMenuData,
): Record<number, string> {
  const map: Record<number, string> = {};
  const add = (dishId: string, url: string | null | undefined) => {
    const id = Number(dishId);
    const u = url?.trim();
    if (Number.isFinite(id) && u) map[id] = u;
  };
  for (const s of menu.sections) {
    for (const d of s.dishes) add(d.id, d.imageUrl);
  }
  for (const d of menu.ungroupedDishes) add(d.id, d.imageUrl);
  return map;
}

function formatVND(v: number): string {
  return `${v.toLocaleString("vi-VN")}đ`;
}

function formatLocalDateTimeForInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function calcPromotionDiscount(
  promo: PromotionResponse | undefined,
  orderTotal: number,
): number {
  if (!promo) return 0;
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
  if (Number.isFinite(promo.minOrderValue) && orderTotal < promo.minOrderValue)
    return 0;

  // discountType: 0 = %, 1 = số tiền (theo cách hiển thị hiện tại của UI)
  const discountType = promo.discountType;
  const discountValue = promo.discountValue ?? 0;

  let raw = 0;
  if (discountType === 0) {
    raw = (orderTotal * discountValue) / 100;
  } else {
    raw = discountValue;
  }

  const maxCap = promo.maxDiscountValue;
  if (typeof maxCap === "number" && Number.isFinite(maxCap) && maxCap > 0) {
    raw = Math.min(raw, maxCap);
  }

  return Math.max(0, Math.floor(raw));
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white px-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function OrderItemRowPreorder({
  item,
  dishImageUrlById,
  updating,
  onIncrease,
  onDecrease,
}: {
  item: CartItem;
  dishImageUrlById: Record<number, string>;
  updating: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const src = item.imageUrl?.trim() || dishImageUrlById[item.dishId]?.trim();
  return (
    <div className="flex w-full items-center gap-3 py-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-100/50">
        <Utensils className="h-5 w-5 text-slate-300" />
        {src ? (
          <img
            src={src}
            alt={item.dishName}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {item.dishName}
        </p>
        {item.promotionName && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <Tag className="h-2.5 w-2.5 shrink-0" />
            {item.promotionName}
          </span>
        )}
        {item.promotionAmount > 0 && (
          <p className="mt-0.5 text-xs text-slate-400 line-through">
            {formatVND(item.originalPrice * item.quantity)}
          </p>
        )}
      </div>
      {/* Qty controls */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={updating}
          onClick={onDecrease}
          aria-label={
            item.quantity === 1
              ? `Xóa ${item.dishName}`
              : `Giảm ${item.dishName}`
          }
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {item.quantity === 1 ? (
            <X className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
        </button>
        <span className="min-w-[1.5rem] text-center text-sm font-bold text-slate-800">
          {updating ? (
            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-emerald-500" />
          ) : (
            item.quantity
          )}
        </span>
        <button
          type="button"
          disabled={updating}
          onClick={onIncrease}
          aria-label={`Tăng ${item.dishName}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <span className="shrink-0 min-w-[4rem] text-right text-sm font-bold text-slate-900">
        {formatVND(item.subTotal)}
      </span>
    </div>
  );
}

function CheckoutPreorderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartId = searchParams.get("cartId") ?? "";
  const restaurantSlug = searchParams.get("restaurant") ?? "";
  const restaurantIdParam = searchParams.get("restaurantId") ?? "";

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedDish[]>([]);
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return formatLocalDateTimeForInput(d);
  });
  const [pickupMin, setPickupMin] = useState(() =>
    formatLocalDateTimeForInput(new Date()),
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [orderResult, setOrderResult] =
    useState<CheckoutBankTransferResponse | null>(null);
  const [bankConfirmed, setBankConfirmed] = useState(false);

  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(
    null,
  );
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  /** dishId đang được cập nhật số lượng (chỉ 1 tại một thời điểm) */
  const [updatingDishId, setUpdatingDishId] = useState<number | null>(null);
  const [updateCartError, setUpdateCartError] = useState<string | null>(null);
  const [addingRecommendationDishId, setAddingRecommendationDishId] = useState<
    number | null
  >(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null,
  );
  /** Ảnh món từ API menu (cùng nguồn trang nhà hàng) — dùng khi cart item không có imageUrl */
  const [dishImageUrlById, setDishImageUrlById] = useState<
    Record<number, string>
  >({});

  const SESSION_RESULT_KEY = cartId ? `s2o_preorder_result_${cartId}` : "";

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const minStr = formatLocalDateTimeForInput(now);
      setPickupMin(minStr);

      setPickupAt((prev) => {
        const prevTime = new Date(prev).getTime();
        if (Number.isFinite(prevTime) && prevTime < now.getTime()) {
          return minStr;
        }
        return prev;
      });
    };
    tick();
    const t = window.setInterval(tick, 15_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!cartId) {
      setCartError("Không tìm thấy giỏ hàng.");
      return;
    }

    // Thử phục hồi state từ session nếu có (dùng cho banner QR quay lại)
    try {
      const savedResult = window.localStorage.getItem(SESSION_RESULT_KEY);
      if (savedResult) {
        const parsed = JSON.parse(savedResult) as {
          orderResult: CheckoutBankTransferResponse;
          phone: string;
          savedAt: number;
        };
        const TTL_MS = PENDING_BANK_TRANSFER_TTL_MS; // 15 phút — đồng bộ với TTL banner "Quay lại thanh toán"
        if (Date.now() - parsed.savedAt > TTL_MS) {
          window.localStorage.removeItem(SESSION_RESULT_KEY);
        } else if (parsed.orderResult) {
          setOrderResult(parsed.orderResult);
          setLookupPhone(parsed.phone);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const cached = loadCartByCartId(cartId);
      if (!cached) {
        setCartError("Giỏ hàng đã hết hạn hoặc chưa có dữ liệu.");
        return;
      }
      setCart(cached as CartResponse);
    } catch {
      setCartError("Không thể đọc giỏ hàng.");
    }
  }, [cartId, SESSION_RESULT_KEY]);

  useEffect(() => {
    const rid = Number(restaurantIdParam);
    if (!cart || !Number.isFinite(rid) || rid <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const menu = await getRestaurantGroupedMenu(rid);
        if (!cancelled) setDishImageUrlById(buildDishImageUrlById(menu));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cart, restaurantIdParam]);

  const fetchRecommendations = async () => {
    if (!cartId) return;
    try {
      const data = await getCartRecommendations(cartId);
      setRecommendations(data);
    } catch (err) {
      console.error("Failed to load recommendations", err);
    }
  };

  const recommendationsFetchedRef = useRef(false);

  useEffect(() => {
    if (!cartId) return;
    if (recommendationsFetchedRef.current) return;
    recommendationsFetchedRef.current = true;
    fetchRecommendations();
  }, [cartId]);

  const totalItems = useMemo(
    () => cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  useEffect(() => {
    if (!cart || !restaurantIdParam) return;
    const fetchPromotions = async () => {
      setLoadingPromotions(true);
      try {
        const res = await getAvailablePromotions({
          restaurantId: Number(restaurantIdParam),
          orderTotal: cart.totalAmount,
        });
        setPromotions(res);
        const best = res.find((p) => p.isRecommended);
        if (best) setSelectedPromotionId(best.id);
      } catch (err) {
        console.error("Failed to load promotions", err);
      } finally {
        setLoadingPromotions(false);
      }
    };
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdParam]); // Chỉ fetch 1 lần khi load trang, không re-fetch mỗi lần qty thay đổi

  /* ── SignalR real-time + fallback polling for bank transfer confirmation ── */
  const activeOrderId =
    orderResult && !bankConfirmed ? orderResult.orderId : null;

  const handleSignalRStatus = useCallback(
    (newStatus: number) => {
      if (newStatus < 1) return;
      setBankConfirmed(true);
      clearPendingBankTransfer();
      if (restaurantIdParam && cart?.cartId) {
        clearCartCache(restaurantIdParam, cart.cartId);
      } else if (cart?.cartId) {
        window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cart.cartId));
      }
      window.dispatchEvent(
        new CustomEvent("s2o-cart-updated", {
          detail: { restaurantId: restaurantIdParam, cartId: "" },
        }),
      );
    },
    [restaurantIdParam, cart?.cartId],
  );

  const fallbackPoll = useCallback(async (): Promise<number | null> => {
    const rid = Number(restaurantIdParam);
    if (!rid || !lookupPhone || !orderResult) return null;
    try {
      const activeOrders = await getCustomerActiveOrders({
        restaurantId: rid,
        phoneNumber: lookupPhone,
      });
      const order = activeOrders.find(
        (o) => o.orderId === orderResult.orderId,
      );
      return order?.status ?? null;
    } catch {
      return null;
    }
  }, [restaurantIdParam, lookupPhone, orderResult]);

  useOrderStatusSignalR(
    activeOrderId,
    handleSignalRStatus,
    fallbackPoll,
    10_000,
  );

  async function handleUpdateQty(dishId: number, newQuantity: number) {
    if (!cart || updatingDishId !== null) return;
    setUpdatingDishId(dishId);
    setUpdateCartError(null);
    try {
      const updated = await updateCartItem({
        cartId: cart.cartId,
        dishId,
        newQuantity,
      });
      setCart(updated);
      if (restaurantIdParam) {
        saveCartCache(Number(restaurantIdParam), updated);
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (e as Error)?.message ||
        "Không thể cập nhật số lượng.";
      setUpdateCartError(msg);
      setTimeout(() => setUpdateCartError(null), 4000);
    } finally {
      setUpdatingDishId(null);
    }
  }

  async function handleAddRecommendation(dish: RecommendedDish) {
    if (!cart || addingRecommendationDishId !== null) return;

    const ridFromQuery = Number(restaurantIdParam);
    const restaurantId =
      Number.isFinite(ridFromQuery) && ridFromQuery > 0
        ? ridFromQuery
        : cart.restaurantId;

    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      setRecommendationError("Không xác định được nhà hàng để thêm món.");
      setTimeout(() => setRecommendationError(null), 4000);
      return;
    }

    setAddingRecommendationDishId(dish.dishId);
    setRecommendationError(null);
    try {
      const updated = await addToCart({
        restaurantId,
        dishId: dish.dishId,
        quantity: 1,
        cartId: cart.cartId,
      });

      setCart(updated);
      saveCartCache(restaurantId, updated);
      setUpdateCartError(null);
      
      // Load món đề xuất mới
      fetchRecommendations();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (e as Error)?.message ||
        "Không thể thêm món gợi ý vào giỏ.";
      setRecommendationError(msg);
      setTimeout(() => setRecommendationError(null), 4000);
    } finally {
      setAddingRecommendationDishId(null);
    }
  }

  async function handleCheckoutBankTransfer() {
    if (!cart?.cartId) return;
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!/^0\d{9}$/.test(trimmed)) {
      setPhoneError("Số điện thoại không hợp lệ (VD: 0901234567).");
      return;
    }
    setPhoneError(null);

    if (!pickupAt) {
      setPickupError("Vui lòng chọn thời gian nhận đơn.");
      return;
    }

    // Chặn chọn thời gian trong quá khứ (phòng trường hợp user chỉnh thủ công)
    const selectedTime = new Date(pickupAt).getTime();
    if (!Number.isFinite(selectedTime) || selectedTime < Date.now() - 30_000) {
      setPickupError(
        "Thời gian nhận đơn không hợp lệ. Vui lòng chọn từ hiện tại trở đi.",
      );
      return;
    }
    setPickupError(null);

    setSubmitting(true);
    setCartError(null);
    try {
      const result = await checkoutBankTransfer({
        cartId: cart.cartId,
        phone: trimmed,
        requestedPickupAt: new Date(pickupAt).toISOString(),
        appliedPromotionId: selectedPromotionId,
      });
      setLookupPhone(trimmed);
      setOrderResult(result);
      setBankConfirmed(false);

      // Lưu pending session để banner "Quay lại thanh toán" có thể hiện trên trang menu
      savePendingBankTransfer({
        orderId: result.orderId,
        qrUrl: result.qrUrl,
        paymentCode: result.paymentCode,
        totalAmount: result.totalAmount,
        restaurantName: result.restaurantName,
        qrCodeBase64: result.qrCodeBase64,
        restaurantId: restaurantIdParam,
        restaurantSlug: restaurantSlug,
        checkoutUrl: window.location.href,
      });

      if (SESSION_RESULT_KEY) {
        window.localStorage.setItem(
          SESSION_RESULT_KEY,
          JSON.stringify({
            orderResult: result,
            phone: trimmed,
            savedAt: Date.now(),
          }),
        );
      }

      // Gi\u1ecf h\u00e0ng c\u1ea7n d\u1ecdn s\u1ea1ch ngay khi t\u1ea1o \u0111\u01a1n th\u00e0nh c\u00f4ng
      // \u0111\u1ec3 n\u1ebfu Back v\u1ec1 Menu, kh\u00f4ng gi\u1eef s\u1ed1 l\u01b0\u1ee3ng c\u0169 g\u00e2y l\u1ed7i "h\u1ebft h\u00e0ng"
      if (restaurantIdParam) {
        clearCartCache(restaurantIdParam, cart.cartId);
      } else {
        window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cart.cartId));
      }
    } catch (e: unknown) {
      const respData = (e as { response?: { data?: { message?: string; errors?: unknown } } })
        ?.response?.data;
      const errors = respData?.errors;

      if (Array.isArray(errors)) {
        const dishIdError = (errors as string[]).find(
          (err) => typeof err === "string" && err.startsWith("failedDishId:")
        );
        if (dishIdError) {
          const failedDishId = parseInt(dishIdError.split(":")[1]);
          if (!isNaN(failedDishId)) {
            toast.error(respData?.message || "Món trong giỏ đã hết hàng.");
            await handleUpdateQty(failedDishId, 0);
            return;
          }
        }
      }

      const msg =
        respData?.message ||
        (e as Error)?.message ||
        "Không thể tạo thanh toán chuyển khoản.";
      setCartError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPromo = promotions.find((p) => p.id === selectedPromotionId);
  const orderTotal = cart?.totalAmount ?? 0;
  const discountAmount = calcPromotionDiscount(selectedPromo, orderTotal);
  const finalAmount = Math.max(0, orderTotal - discountAmount);
  const effectiveDiscount = Math.max(
    0,
    orderTotal - (selectedPromo ? finalAmount : orderTotal),
  );

  const backToMenuHref = useMemo(() => {
    if (restaurantIdParam) {
      return ROUTES.RESTAURANT(restaurantIdParam);
    }
    const slug = restaurantSlug.trim();
    if (slug) {
      return ROUTES.RESTAURANT_SLUG(slug);
    }
    return ROUTES.HOME;
  }, [restaurantSlug, restaurantIdParam]);

  const goToHomeOrderLookup = useCallback(
    (phoneNumber: string) => {
      const phone = phoneNumber.trim();
      if (phone) {
        try {
          window.sessionStorage.setItem("s2o_lookup_phone_all", phone);
        } catch {
          /* ignore */
        }
      }
      router.push(`${ROUTES.HOME}?orderLookup=1`);
    },
    [router],
  );

  const contentColumnClass =
    "mx-auto w-full max-w-lg sm:max-w-xl md:max-w-2xl px-4 sm:px-6";

  return (
    <MainLayout hideHeader hideFooter>
      <div className="flex min-h-screen w-full flex-col bg-slate-50">
        {!orderResult && (
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-emerald-800">
                Thanh toán đơn đặt trước
              </p>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                Thanh toán chuyển khoản và chọn thời gian nhận đơn.
              </p>
            </div>
            <ShoppingCart className="h-5 w-5 shrink-0 text-emerald-600" />
          </header>
        )}

        {!orderResult ? (
          <>
            <div className="flex flex-1 flex-col gap-3 bg-gradient-to-b from-emerald-50/50 to-slate-50 py-4 pb-40 sm:px-2">
              <div className={contentColumnClass}>

                {cart && (
                  <SectionCard>
                    <div className="flex items-center gap-2 py-3 text-slate-700">
                      <ShoppingCart className="h-4 w-4" />
                      <p className="text-sm font-semibold">{totalItems} món</p>
                    </div>
                    <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
                      {cart.items.map((item) => (
                        <OrderItemRowPreorder
                          key={item.dishId}
                          item={item}
                          dishImageUrlById={dishImageUrlById}
                          updating={updatingDishId === item.dishId}
                          onIncrease={() =>
                            handleUpdateQty(item.dishId, item.quantity + 1)
                          }
                          onDecrease={() =>
                            handleUpdateQty(item.dishId, item.quantity - 1)
                          }
                        />
                      ))}
                    </div>
                    {updateCartError && (
                      <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 mb-2 text-xs font-semibold text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {updateCartError}
                      </div>
                    )}
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center justify-between py-3">
                      <p className="text-sm font-semibold text-slate-600">
                        Tổng cộng
                      </p>
                      <p className="text-lg font-extrabold text-slate-900">
                        {formatVND(cart.totalAmount)}
                      </p>
                    </div>
                  </SectionCard>
                )}

                {cart && recommendations.length > 0 && (
                  <SectionCard className="mt-3 py-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-extrabold text-slate-800">
                        Gợi ý cho bạn
                      </p>
                    </div>

                    {recommendationError && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {recommendationError}
                      </div>
                    )}

                    <div className="space-y-2">
                      {recommendations.map((dish) => {
                        const hasDiscount =
                          Number.isFinite(dish.discountedPrice) &&
                          dish.discountedPrice > 0 &&
                          dish.discountedPrice !== dish.price;
                        const finalPrice = hasDiscount
                          ? dish.discountedPrice
                          : dish.price;
                        const soldOut =
                          Boolean(dish.isSoldOut) ||
                          (typeof dish.dishAvailabilityStock === "number" &&
                            dish.dishAvailabilityStock <= 0);

                        return (
                          <div
                            key={dish.dishId}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-100/50">
                                <Utensils className="h-5 w-5 text-slate-300" />
                                {dish.imageUrl ? (
                                  <img
                                    src={dish.imageUrl}
                                    alt={dish.dishName}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    onError={(e) => {
                                      (
                                        e.currentTarget as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : null}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {dish.dishName}
                                </p>
                                {dish.description && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                    {dish.description}
                                  </p>
                                )}
                                {dish.type === 1 &&
                                  dish.comboItems?.length > 0 && (
                                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                                      {dish.comboItems.map((combo, index) => (
                                        <li
                                          key={`${dish.dishId}-${combo.dishId}-${index}`}
                                        >
                                          x{combo.quantity} {combo.dishName}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-sm font-bold text-emerald-700">
                                    {formatVND(finalPrice)}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-[11px] text-slate-400 line-through">
                                      {formatVND(dish.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  soldOut ||
                                  addingRecommendationDishId === dish.dishId
                                }
                                onClick={() => handleAddRecommendation(dish)}
                                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {addingRecommendationDishId === dish.dishId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                                <span>{soldOut ? "Hết" : "Thêm"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}

                {cart && (
                  <SectionCard className="mt-3 py-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-extrabold text-slate-800">
                        Khuyến mãi &amp; Ưu đãi
                      </p>
                      {loadingPromotions && (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!loadingPromotions && promotions.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                          Hiện không có khuyến mãi nào áp dụng cho đơn hàng này.
                        </p>
                      )}
                      {promotions.map((promo) => {
                        const isSelected = selectedPromotionId === promo.id;
                        let Icon = Tag;
                        if (promo.type === 1) Icon = Clock;
                        if (promo.type === 2) Icon = Flame;
                        if (promo.type === 3) Icon = CalendarDays;

                        let tagLabel = "";
                        if (promo.discountType === 0)
                          tagLabel = `-${promo.discountValue}%`;
                        else tagLabel = `-${formatVND(promo.discountValue)}`;

                        return (
                          <label
                            key={promo.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50/50"
                                : "border-slate-100 bg-white hover:border-slate-200"
                            }`}
                          >
                            <div className="flex h-5 items-center">
                              <input
                                type="radio"
                                name="promotion"
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedPromotionId(promo.id)
                                }
                                className="h-4 w-4 cursor-pointer text-emerald-600 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Icon
                                  className={`h-3.5 w-3.5 ${
                                    promo.type === 2
                                      ? "text-rose-500"
                                      : promo.type === 1
                                        ? "text-blue-500"
                                        : promo.type === 3
                                          ? "text-amber-500"
                                          : "text-slate-500"
                                  }`}
                                />
                                <p className="break-words text-sm font-bold text-slate-800">
                                  {promo.name}
                                </p>
                                <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                                  {tagLabel}
                                </span>
                                {promo.isRecommended && (
                                  <span className="shrink-0 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    Tốt nhất
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Đơn từ {formatVND(promo.minOrderValue)}
                                {promo.discountType === 0 &&
                                promo.maxDiscountValue
                                  ? ` • Tối đa ${formatVND(promo.maxDiscountValue)}`
                                  : ""}
                              </p>
                              {promo.endDate && (
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  HSD:{" "}
                                  {new Date(promo.endDate).toLocaleDateString(
                                    "vi-VN",
                                  )}
                                </p>
                              )}
                              {promo.type === 1 && promo.dailyEndTime && (
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  Hiệu lực {promo.dailyStartTime?.slice(0, 5)} –{" "}
                                  {promo.dailyEndTime?.slice(0, 5)}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {promotions.length > 0 &&
                        selectedPromotionId !== null && (
                          <button
                            type="button"
                            onClick={() => setSelectedPromotionId(null)}
                            className="mt-1 self-start p-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                          >
                            Bỏ chọn khuyến mãi
                          </button>
                        )}
                    </div>
                  </SectionCard>
                )}

                {cart && (
                  <>
                    <SectionCard className="mt-3 py-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Số điện thoại
                        </span>
                        <input
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setPhoneError(null);
                          }}
                          inputMode="tel"
                          placeholder="VD: 0901234567"
                          className="block h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                        {phoneError && (
                          <p className="mt-1 text-xs font-semibold text-rose-600">
                            {phoneError}
                          </p>
                        )}
                      </label>
                    </SectionCard>

                    <SectionCard className="mt-3 py-3">
                      <label className="flex flex-col gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <CalendarClock className="h-4 w-4 text-emerald-700" />
                          Thời gian nhận đơn
                        </span>
                        <input
                          type="datetime-local"
                          value={pickupAt}
                          min={pickupMin}
                          required
                          onChange={(e) => {
                            const next = e.target.value;
                            const nextTime = new Date(next).getTime();
                            const minTime = new Date(pickupMin).getTime();
                            if (
                              Number.isFinite(nextTime) &&
                              Number.isFinite(minTime) &&
                              nextTime < minTime
                            ) {
                              setPickupAt(pickupMin);
                            } else {
                              setPickupAt(next);
                            }
                            setPickupError(null);
                          }}
                          className="block h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 invalid:border-rose-300 invalid:bg-slate-50 invalid:text-slate-400"
                        />
                        {pickupError && (
                          <p className="mt-1 text-xs font-semibold text-rose-600">
                            {pickupError}
                          </p>
                        )}
                      </label>
                    </SectionCard>

                    {cartError && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                        <p className="text-sm text-rose-700">{cartError}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {cart && (
              <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white px-4 py-3 shadow-2xl sm:px-6">
                <div className={contentColumnClass}>
                  {selectedPromo && discountAmount > 0 && (
                    <div className="mb-1 flex items-center justify-between px-1 text-xs font-semibold text-emerald-700">
                      <span>Giảm</span>
                      <span>- {formatVND(effectiveDiscount)}</span>
                    </div>
                  )}
                  <div className="mb-2 flex items-center justify-between px-1 text-sm">
                    <span className="font-semibold text-slate-600">
                      Tổng thanh toán
                    </span>
                    <div className="flex flex-col items-end">
                      {selectedPromo && discountAmount > 0 && (
                        <span className="mb-0.5 text-xs text-slate-400 line-through">
                          {formatVND(cart.totalAmount)}
                        </span>
                      )}
                      <span className="text-lg font-extrabold leading-none text-slate-900">
                        {formatVND(
                          selectedPromo ? finalAmount : cart.totalAmount,
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCheckoutBankTransfer}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-200/50 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang tạo mã chuyển khoản...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-5 w-5" />
                        Đặt hàng ngay
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : bankConfirmed ? (
          <div className={`${contentColumnClass} space-y-3 pb-8 pt-4`}>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-500 px-4 pb-8 pt-8 text-white shadow-md">
              <CheckCircle2 className="h-16 w-16" />
              <p className="text-2xl font-extrabold">Đặt hàng thành công!</p>
              <p className="text-sm text-emerald-100">
                {orderResult.restaurantName}
              </p>
            </div>

            <div className="-mt-2 flex flex-col gap-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-extrabold text-emerald-900">
                      Thanh toán đã được xác nhận
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                      Đơn hàng đã được gửi xuống bếp để chế biến.
                    </p>
                  </div>
                </div>
              </div>

              <SectionCard className="border border-slate-100 py-4 shadow-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Tổng tiền</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {formatVND(orderResult.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">SĐT</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {lookupPhone}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Thời gian nhận</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {new Date(pickupAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Trạng thái</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Đã xác nhận
                  </span>
                </div>
              </SectionCard>

              {orderResult.qrCodeBase64 && (
                <SectionCard className="flex flex-col items-center gap-2 border border-slate-100 py-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Đưa mã này cho nhân viên quầy khi nhận món
                  </p>
                  <img
                    src={orderResult.qrCodeBase64}
                    alt="QR đơn hàng"
                    className="h-44 w-44 rounded-xl border-2 border-emerald-200"
                  />
                </SectionCard>
              )}

              <button
                type="button"
                onClick={() => router.push(backToMenuHref)}
                className="mt-2 w-full rounded-2xl bg-emerald-500 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.99]"
              >
                Quay về menu
              </button>

              <button
                type="button"
                onClick={() => goToHomeOrderLookup(lookupPhone)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-base font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Tra cứu hóa đơn
              </button>
            </div>
          </div>
        ) : (
          <div className={`${contentColumnClass} space-y-3 pb-8 pt-4`}>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-amber-500 px-4 pb-8 pt-8 text-white shadow-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <QrCode className="h-9 w-9 text-white" />
              </div>
              <p className="text-2xl font-extrabold">Quét mã để thanh toán</p>
              <p className="text-sm text-amber-100">
                {orderResult.restaurantName}
              </p>
            </div>

            <div className="-mt-2 flex flex-col gap-3">
              {orderResult.qrUrl && (
                <SectionCard className="flex flex-col items-center gap-2 border border-slate-100 py-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    QR thanh toán VietQR
                  </p>
                  <img
                    src={orderResult.qrUrl}
                    alt="VietQR"
                    className="h-auto w-full max-w-[min(100%,13.5rem)] rounded-xl border border-slate-200 object-contain sm:max-w-[15rem]"
                  />
                </SectionCard>
              )}

              <SectionCard className="border border-slate-100 py-4 shadow-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Số tiền</span>
                  <span className="text-base font-extrabold text-amber-600">
                    {formatVND(orderResult.totalAmount)}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Nội dung CK</span>
                  <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-sm font-extrabold text-amber-800">
                    {orderResult.paymentCode}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Thời gian nhận</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {new Date(pickupAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Trạng thái</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    Chờ xác nhận chuyển khoản
                  </span>
                </div>
              </SectionCard>

              <button
                type="button"
                onClick={() => router.push(backToMenuHref)}
                className="mt-2 w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white shadow-md active:scale-[0.99]"
              >
                Quay về menu
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function CheckoutPreorderPage() {
  return (
    <Suspense
      fallback={
        <MainLayout hideHeader hideFooter>
          <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </MainLayout>
      }
    >
      <CheckoutPreorderContent />
    </Suspense>
  );
}

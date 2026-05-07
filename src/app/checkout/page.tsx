"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Minus,
  Plus,
  QrCode,
  ReceiptText,
  ShoppingBag,
  Tag,
  TriangleAlert,
  Flame,
  CalendarDays,
  Ticket,
  Utensils,
  X,
} from "lucide-react";
import {
  addToCart,
  checkoutBankTransfer,
  checkoutCash,
  getCustomerActiveOrders,
  getAvailablePromotions,
  getCartRecommendations,
  updateCartItem,
  PENDING_BANK_TRANSFER_TTL_MS,
  CART_DATA_STORAGE_KEY,
  savePendingBankTransfer,
  clearPendingBankTransfer,
  clearCartCache,
  loadCartByCartId,
  saveCartCache,
  type CartItem,
  type CartResponse,
  type CheckoutBankTransferResponse,
  type CheckoutCashResponse,
  type PromotionResponse,
  type RecommendedDish,
} from "@/services/orderCustomerService";
import { getRestaurantGroupedMenu } from "@/services/menuRestaurantTemplateService";
import type { RestaurantMenuData } from "@/types";
import { toast } from "react-toastify";
import { useOrderStatusSignalR } from "@/hooks/useOrderStatusSignalR";
import { useMenuSignalR } from "@/hooks/useMenuSignalR";

/* ─── Helpers ─── */
function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "đ";
}

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

/* ─── Types ─── */
type PayMethod = "cash" | "bank";

type OrderStep =
  | { kind: "form" }
  | { kind: "loading"; method: PayMethod }
  | { kind: "done_cash"; result: CheckoutCashResponse }
  | { kind: "done_bank"; result: CheckoutBankTransferResponse; phone: string }
  | { kind: "error"; method: PayMethod; message: string };

/* ─── Sub-components ─── */
interface OrderItemRowProps {
  item: CartItem;
  dishImageUrlById: Record<number, string>;
  updating: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}

function OrderItemRow({
  item,
  dishImageUrlById,
  updating,
  onIncrease,
  onDecrease,
}: OrderItemRowProps) {
  const src = item.imageUrl?.trim() || dishImageUrlById[item.dishId]?.trim();
  return (
    <div className="flex items-center gap-3 py-3 w-full">
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
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800 ring-1 ring-orange-200">
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
            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-orange-400" />
          ) : (
            item.quantity
          )}
        </span>
        <button
          type="button"
          disabled={updating}
          onClick={onIncrease}
          aria-label={`Tăng ${item.dishName}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <p className="shrink-0 min-w-[4.5rem] text-right text-sm font-bold text-orange-600">
        {formatVND(item.subTotal)}
      </p>
    </div>
  );
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

/* ─── Main checkout content ─── */
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartId = searchParams.get("cartId") ?? "";
  const restaurantSlug = searchParams.get("restaurant") ?? "";
  const restaurantIdParam = searchParams.get("restaurantId") ?? "";

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedDish[]>([]);

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PayMethod>("cash");
  const [step, setStep] = useState<OrderStep>({ kind: "form" });
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [bankConfirmed, setBankConfirmed] = useState(false);

  /** dishId đang được cập nhật số lượng (chỉ 1 tại một thời điểm) */
  const [updatingDishId, setUpdatingDishId] = useState<number | null>(null);
  const [updateCartError, setUpdateCartError] = useState<string | null>(null);
  const [addingRecommendationDishId, setAddingRecommendationDishId] = useState<
    number | null
  >(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null,
  );

  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(
    null,
  );
  const [loadingPromotions, setLoadingPromotions] = useState(false);

  /** Ảnh món từ API menu — dùng khi cart item không có imageUrl */
  const [dishImageUrlById, setDishImageUrlById] = useState<
    Record<number, string>
  >({});

  const SESSION_RESULT_KEY = cartId ? `s2o_order_result_${cartId}` : "";

  useEffect(() => {
    if (!cartId) {
      setCartError("Không tìm thấy giỏ hàng. Vui lòng quay lại menu.");
      return;
    }
    try {
      const savedResult = window.localStorage.getItem(SESSION_RESULT_KEY);
      if (savedResult) {
        const parsed = JSON.parse(savedResult) as {
          step: OrderStep;
          savedAt: number;
        };
        const TTL_MS = PENDING_BANK_TRANSFER_TTL_MS; // 15 phút — đồng bộ với TTL banner "Quay lại thanh toán"
        if (Date.now() - parsed.savedAt > TTL_MS) {
          window.localStorage.removeItem(SESSION_RESULT_KEY);
        } else if (
          parsed.step?.kind === "done_cash" ||
          parsed.step?.kind === "done_bank"
        ) {
          setStep(parsed.step);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const cached = loadCartByCartId(cartId);
      if (!cached) {
        setCartError("Giỏ hàng đã hết hạn. Vui lòng thêm lại.");
        return;
      }
      setCart(cached as CartResponse);
    } catch {
      setCartError("Không thể đọc dữ liệu giỏ hàng.");
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

  // ─── Fetch promotions ────────────────────────────────────────────────────────
  // Stable callback so it can be called on initial mount AND by SignalR.
  const refetchPromotions = useCallback(async () => {
    if (!cart || !restaurantIdParam) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.cartId, restaurantIdParam]);

  // Initial load — run once when cart is first available
  const promotionFetchedRef = useRef(false);
  useEffect(() => {
    if (!cart || !restaurantIdParam) return;
    if (promotionFetchedRef.current) return;
    promotionFetchedRef.current = true;
    refetchPromotions();
  }, [cart, restaurantIdParam, refetchPromotions]);

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

  /* ── Determine the active order ID for SignalR listening ── */
  const activeOrderId: string | null = (() => {
    if (step.kind === "done_cash" && !cashConfirmed) return step.result.orderId;
    if (step.kind === "done_bank" && !bankConfirmed) return step.result.orderId;
    return null;
  })();

  /** Callback invoked by SignalR (or fallback poll) when the order status changes. */
  const handleSignalRStatus = useCallback(
    (newStatus: number) => {
      if (newStatus < 1) return; // still Unpaid, nothing to do

      if (step.kind === "done_cash" && !cashConfirmed) {
        setCashConfirmed(true);
        if (restaurantIdParam) {
          clearCartCache(restaurantIdParam, cartId);
        } else {
          window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
        }
      }

      if (step.kind === "done_bank" && !bankConfirmed) {
        setBankConfirmed(true);
        clearPendingBankTransfer();
        if (restaurantIdParam) {
          clearCartCache(restaurantIdParam, cartId);
        } else {
          window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
        }
      }
    },
    [step, cashConfirmed, bankConfirmed, restaurantIdParam, cartId],
  );

  /** Fallback polling function — only called when SignalR is disconnected (10 s interval). */
  const fallbackPoll = useCallback(async (): Promise<number | null> => {
    const rid = Number(restaurantIdParam);
    if (!rid) return null;

    const phoneForPoll =
      step.kind === "done_cash"
        ? step.result.phone
        : step.kind === "done_bank"
          ? step.phone
          : null;
    const orderIdForPoll =
      step.kind === "done_cash"
        ? step.result.orderId
        : step.kind === "done_bank"
          ? step.result.orderId
          : null;

    if (!phoneForPoll || !orderIdForPoll) return null;

    try {
      const activeOrders = await getCustomerActiveOrders({
        restaurantId: rid,
        phoneNumber: phoneForPoll,
      });
      const order = activeOrders.find((o) => o.orderId === orderIdForPoll);
      return order?.status ?? null;
    } catch {
      return null;
    }
  }, [step, restaurantIdParam]);

  // 🔌 SignalR real-time + fallback polling (10 s when disconnected)
  useOrderStatusSignalR(
    activeOrderId,
    handleSignalRStatus,
    fallbackPoll,
    10_000,
  );

  // 🔌 SignalR: lắng nghe MenuChanged để refetch promotion khi có KM mới
  const menuSignalRId = restaurantIdParam ? Number(restaurantIdParam) : null;
  useMenuSignalR(
    Number.isFinite(menuSignalRId) && menuSignalRId! > 0 ? menuSignalRId : null,
    refetchPromotions,
  );

  const backHref = restaurantSlug
    ? `/menu?restaurant=${encodeURIComponent(restaurantSlug)}`
    : "/";
  const isLoading = step.kind === "loading";

  const goToOrderLookup = useCallback(
    (phoneNumber: string) => {
      const rid = restaurantIdParam?.trim();
      const rslug = restaurantSlug?.trim();
      const phone = phoneNumber.trim();

      if (rid && phone) {
        try {
          window.sessionStorage.setItem(`s2o_lookup_phone_${rid}`, phone);
        } catch {
          /* ignore */
        }
      }

      const params = new URLSearchParams();
      if (rid) params.set("restaurantId", rid);
      if (rslug) params.set("restaurantSlug", rslug);
      router.push(`/orders/lookup?${params.toString()}`);
    },
    [restaurantIdParam, restaurantSlug, router],
  );

  /**
   * Gọi API update-item với newQuantity tuyệt đối.
   * Sau khi thành công luôn cập nhật toàn bộ cart từ response (backend sync giá/KM/tồn kho).
   */
  async function handleUpdateQty(dishId: number, newQuantity: number) {
    if (!cart || updatingDishId !== null) return;
    setUpdatingDishId(dishId);
    setUpdateCartError(null);
    try {
      const updated = await updateCartItem({ cartId, dishId, newQuantity });
      setCart(updated);
      // Sync lại localStorage để trang menu cũng nhận được cart mới nhất
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
      // Tự xóa lỗi sau 4s
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

  function clearOrderData() {
    if (restaurantIdParam) {
      clearCartCache(restaurantIdParam, cartId);
      return;
    }
    window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
    // Cố tình không xoá SESSION_RESULT_KEY để người dùng nhấn nút "Quét QR" trên banner
    // quay lại trang này vẫn load được giao diện thanh toán gốc.
  }

  async function handlePlaceOrder() {
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
    setStep({ kind: "loading", method: selectedMethod });

    try {
      let newStep: OrderStep;
      if (selectedMethod === "cash") {
        const res = await checkoutCash({
          cartId,
          phone: trimmed,
          appliedPromotionId: selectedPromotionId,
        });
        newStep = { kind: "done_cash", result: res };
      } else {
        const res = await checkoutBankTransfer({
          cartId,
          phone: trimmed,
          appliedPromotionId: selectedPromotionId,
        });
        newStep = { kind: "done_bank", result: res, phone: trimmed };

        // Lưu pending session để banner "Quay lại thanh toán" có thể hiện trên trang menu
        savePendingBankTransfer({
          orderId: res.orderId,
          qrUrl: res.qrUrl,
          paymentCode: res.paymentCode,
          totalAmount: res.totalAmount,
          restaurantName: res.restaurantName,
          qrCodeBase64: res.qrCodeBase64,
          restaurantId: restaurantIdParam,
          restaurantSlug: restaurantSlug,
          checkoutUrl: window.location.href,
        });
      }
      setStep(newStep);

      if (SESSION_RESULT_KEY) {
        window.localStorage.setItem(
          SESSION_RESULT_KEY,
          JSON.stringify({ step: newStep, savedAt: Date.now() }),
        );
      }

      // Ngay khi tạo đơn thành công (Dù chưa thanh toán), giỏ hàng cần dọn sạch
      // để nếu Back về Menu, nó không giữ số lượng cũ gây lỗi "hết hàng".
      if (restaurantIdParam) {
        clearCartCache(restaurantIdParam, cartId);
      } else {
        window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
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
            setStep({ kind: "form" });
            return;
          }
        }
      }

      const msg =
        respData?.message ||
        (e as Error)?.message ||
        "Đặt hàng thất bại. Vui lòng thử lại.";
      setStep({ kind: "error", method: selectedMethod, message: msg });
    }
  }

  /* ── Error / loading cart ── */
  if (cartError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <AlertCircle className="h-12 w-12 text-rose-400" />
        <p className="text-center text-sm font-semibold text-slate-700">
          {cartError}
        </p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.98]"
        >
          Quay về menu
        </button>
      </div>
    );
  }

  if (step.kind === "done_cash") {
    const r = step.result;

    if (cashConfirmed) {
      return (
        <div className="flex min-h-screen flex-col bg-slate-50">
          <div className="flex flex-col items-center gap-3 bg-emerald-500 px-4 pb-10 pt-12 text-white">
            <CheckCircle2 className="h-16 w-16" />
            <p className="text-2xl font-extrabold">Đặt hàng thành công!</p>
            <p className="text-sm text-emerald-100">{r.restaurantName}</p>
          </div>

          <div className="-mt-4 flex flex-col gap-3 px-4 pb-8">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-900">
                    Nhân viên đã xác nhận thu tiền
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                    Đơn hàng đã được gửi xuống bếp để chế biến.
                  </p>
                </div>
              </div>
            </div>

            <SectionCard className="py-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Số thứ tự</span>
                <span className="text-3xl font-extrabold text-slate-900">
                  #{r.orderCode}
                </span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Tổng tiền</span>
                <span className="text-base font-extrabold text-emerald-600">
                  {formatVND(r.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">SĐT</span>
                <span className="text-sm font-semibold text-slate-800">
                  {r.phone}
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

            {r.qrCodeBase64 && (
              <SectionCard className="flex flex-col items-center gap-2 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Đưa mã này cho nhân viên quầy khi nhận món
                </p>
                <img
                  src={r.qrCodeBase64}
                  alt="QR đơn hàng"
                  className="h-44 w-44 rounded-xl border-2 border-emerald-200"
                />
              </SectionCard>
            )}

            <button
              type="button"
              onClick={() => {
                clearOrderData();
                router.push(backHref);
              }}
              className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Quay về menu
            </button>

            <button
              type="button"
              onClick={() => goToOrderLookup(r.phone)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-base font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Tra cứu hóa đơn
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <div className="flex flex-col items-center gap-3 bg-amber-500 px-4 pb-10 pt-12 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Clock className="h-9 w-9 text-white" />
          </div>
          <p className="text-2xl font-extrabold">Đơn chờ thanh toán</p>
          <p className="text-sm text-amber-100">{r.restaurantName}</p>
        </div>

        <div className="-mt-4 flex flex-col gap-3 px-4 pb-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-extrabold text-amber-900">
                  Vui lòng đến quầy thu ngân để thanh toán
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  Bếp chưa nhận đơn. Sau khi nhân viên xác nhận thu tiền, đơn
                  hàng mới được gửi xuống bếp để chế biến.
                </p>
              </div>
            </div>
          </div>

          <SectionCard className="py-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Số thứ tự</span>
              <span className="text-3xl font-extrabold text-slate-900">
                #{r.orderCode}
              </span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Tổng tiền cần trả</span>
              <span className="text-base font-extrabold text-amber-600">
                {formatVND(r.totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">SĐT</span>
              <span className="text-sm font-semibold text-slate-800">
                {r.phone}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Trạng thái</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Chờ thu ngân xác nhận
              </span>
            </div>
          </SectionCard>

          <button
            type="button"
            onClick={() => {
              clearOrderData();
              router.push(backHref);
            }}
            className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
          >
            Quay về menu
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "done_bank") {
    const r = step.result;

    if (bankConfirmed) {
      return (
        <div className="flex min-h-screen flex-col bg-slate-50">
          <div className="flex flex-col items-center gap-3 bg-emerald-500 px-4 pb-10 pt-12 text-white">
            <CheckCircle2 className="h-16 w-16" />
            <p className="text-2xl font-extrabold">Đặt hàng thành công!</p>
            <p className="text-sm text-emerald-100">{r.restaurantName}</p>
          </div>
          <div className="-mt-4 flex flex-col gap-3 px-4 pb-8">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
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

            <SectionCard className="py-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Tổng tiền</span>
                <span className="text-base font-extrabold text-emerald-600">
                  {formatVND(r.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">SĐT</span>
                <span className="text-sm font-semibold text-slate-800">
                  {step.phone}
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

            {r.qrCodeBase64 && (
              <SectionCard className="flex flex-col items-center gap-2 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Đưa mã này cho nhân viên quầy khi nhận món
                </p>
                <img
                  src={r.qrCodeBase64}
                  alt="QR đơn hàng"
                  className="h-44 w-44 rounded-xl border-2 border-emerald-200"
                />
              </SectionCard>
            )}

            <button
              type="button"
              onClick={() => {
                clearOrderData();
                router.push(backHref);
              }}
              className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Quay về menu
            </button>

            <button
              type="button"
              onClick={() => goToOrderLookup(step.phone)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-base font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Tra cứu hóa đơn
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <div className="flex flex-col items-center gap-3 bg-amber-500 px-4 pb-10 pt-12 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <QrCode className="h-9 w-9 text-white" />
          </div>
          <p className="text-2xl font-extrabold">Quét mã để thanh toán</p>
          <p className="text-sm text-amber-100">{r.restaurantName}</p>
        </div>

        <div className="-mt-4 flex flex-col gap-3 px-4 pb-8">
          {r.qrUrl && (
            <SectionCard className="flex flex-col items-center gap-2 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                QR thanh toán VietQR
              </p>
              <img
                src={r.qrUrl}
                alt="VietQR"
                className="h-52 w-52 rounded-xl border border-slate-200 object-contain"
              />
            </SectionCard>
          )}

          <SectionCard className="py-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Số tiền</span>
              <span className="text-base font-extrabold text-amber-600">
                {formatVND(r.totalAmount)}
              </span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Nội dung CK</span>
              <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-sm font-extrabold text-amber-800">
                {r.paymentCode}
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
            onClick={() => {
              clearOrderData();
              router.push(backHref);
            }}
            className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
          >
            Quay về menu
          </button>
        </div>
      </div>
    );
  }

  /* ── Loading cart ── */
  if (!cart) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  /* ── Form screen ── */
  const selectedPromo = promotions.find((p) => p.id === selectedPromotionId);
  const discountAmount = selectedPromo?.discountAmount ?? 0;
  const finalAmountCalculated = Math.max(
    0,
    (cart?.totalAmount ?? 0) - discountAmount,
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-orange-100 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-base font-extrabold text-slate-900">
            Xác nhận đơn hàng
          </p>
        </div>
        <ShoppingBag className="h-5 w-5 text-orange-400" />
      </header>

      <div className="flex flex-1 flex-col gap-3 bg-gradient-to-b from-orange-50/50 to-white px-4 py-4 pb-36">
        {/* Danh sách món */}
        <SectionCard>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-extrabold text-slate-800">
                Đơn hàng của bạn
              </p>
            </div>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
              {cart.items.length} món
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {cart.items.map((item) => (
              <OrderItemRow
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
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {updateCartError}
            </div>
          )}
          <div className="h-px bg-slate-100" />
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-semibold text-slate-600">Tổng cộng</p>
            <p className="text-lg font-extrabold text-orange-600">
              {formatVND(cart.totalAmount)}
            </p>
          </div>
        </SectionCard>

        {recommendations.length > 0 && (
          <SectionCard className="py-3">
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
                        {dish.type === 1 && dish.comboItems?.length > 0 && (
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
                          <span className="text-sm font-bold text-orange-600">
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
                          soldOut || addingRecommendationDishId === dish.dishId
                        }
                        onClick={() => handleAddRecommendation(dish)}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-orange-500 px-3 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
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

        {/* Khuyến mãi - luôn hiển thị */}
        <SectionCard className="py-3">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="h-4 w-4 text-orange-500" />
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
                      ? "border-orange-500 bg-orange-50/70"
                      : "border-slate-100 bg-white hover:border-orange-200"
                  }`}
                >
                  <div className="flex h-5 items-center">
                    <input
                      type="radio"
                      name="promotion"
                      checked={isSelected}
                      onChange={() => setSelectedPromotionId(promo.id)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <Icon
                        className={`h-3.5 w-3.5 ${promo.type === 2 ? "text-rose-500" : promo.type === 1 ? "text-blue-500" : promo.type === 3 ? "text-amber-500" : "text-slate-500"}`}
                      />
                      <p className="text-sm font-bold text-slate-800 break-words">
                        {promo.name}
                      </p>
                      <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                        {tagLabel}
                      </span>
                      {promo.isRecommended && (
                        <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800 border border-orange-200">
                          Tốt nhất
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Đơn từ {formatVND(promo.minOrderValue)}
                      {promo.discountType === 0 && promo.maxDiscountValue
                        ? ` • Tối đa ${formatVND(promo.maxDiscountValue)}`
                        : ""}
                    </p>
                    {promo.endDate && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        HSD:{" "}
                        {new Date(promo.endDate).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                    {promo.type === 1 && promo.dailyEndTime && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Hiệu lực {promo.dailyStartTime?.slice(0, 5)} -{" "}
                        {promo.dailyEndTime?.slice(0, 5)}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
            {promotions.length > 0 && selectedPromotionId !== null && (
              <button
                type="button"
                onClick={() => setSelectedPromotionId(null)}
                className="mt-1 text-xs font-semibold text-slate-400 hover:text-slate-600 self-start p-1"
              >
                Bỏ chọn khuyến mãi
              </button>
            )}
          </div>
        </SectionCard>

        {/* Thông tin khách */}
        <SectionCard className="py-3">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-orange-600/80">
            Thông tin liên hệ
          </p>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError(null);
              if (step.kind === "error") setStep({ kind: "form" });
            }}
            placeholder="Số điện thoại (VD: 0901234567)"
            className="h-12 w-full rounded-xl border border-orange-100 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
            disabled={isLoading}
          />
          {phoneError && (
            <p className="mt-1.5 text-xs font-semibold text-rose-500">
              {phoneError}
            </p>
          )}
        </SectionCard>

        {/* Phương thức thanh toán */}
        <SectionCard className="py-3">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-orange-600/80">
            Phương thức thanh toán
          </p>
          <div className="flex flex-col gap-2">
            {(
              [
                {
                  id: "cash" as PayMethod,
                  icon: <Banknote className="h-5 w-5" />,
                  label: "Tiền mặt",
                  desc: "Thanh toán khi nhận món",
                },
                {
                  id: "bank" as PayMethod,
                  icon: <QrCode className="h-5 w-5" />,
                  label: "Chuyển khoản",
                  desc: "Quét QR VietQR tự động xác nhận",
                },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={isLoading}
                onClick={() => setSelectedMethod(m.id)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                  selectedMethod === m.id
                    ? "border-orange-500 bg-orange-500 shadow-md shadow-orange-200/40"
                    : "border-slate-200 bg-white hover:border-orange-200"
                }`}
              >
                <span
                  className={
                    selectedMethod === m.id ? "text-white" : "text-slate-500"
                  }
                >
                  {m.icon}
                </span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-bold ${
                      selectedMethod === m.id ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {m.label}
                  </p>
                  <p
                    className={`text-xs ${
                      selectedMethod === m.id
                        ? "text-orange-100"
                        : "text-slate-400"
                    }`}
                  >
                    {m.desc}
                  </p>
                </div>
                {selectedMethod === m.id && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Error */}
        {step.kind === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700">{step.message}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-orange-100 bg-white px-4 py-3 shadow-2xl">
        <div className="mx-auto max-w-lg">
          {selectedPromo && (
            <div className="mb-1 flex items-center justify-between px-1 text-xs font-semibold text-orange-600">
              <span>Đã áp dụng mã</span>
              <span>-{formatVND(discountAmount)}</span>
            </div>
          )}
          <div className="mb-2 flex items-center justify-between px-1 text-sm">
            <span className="font-semibold text-slate-600">
              Tổng thanh toán
            </span>
            <div className="flex flex-col items-end">
              {selectedPromo && (
                <span className="text-xs text-slate-400 line-through mb-0.5">
                  {formatVND(cart.totalAmount)}
                </span>
              )}
              <span className="font-extrabold text-orange-600 text-lg leading-none">
                {formatVND(finalAmountCalculated)}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={handlePlaceOrder}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-200/50 transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang xử lý…
              </>
            ) : (
              <>
                {selectedMethod === "cash" ? (
                  <Banknote className="h-5 w-5" />
                ) : (
                  <QrCode className="h-5 w-5" />
                )}
                Đặt hàng ngay
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

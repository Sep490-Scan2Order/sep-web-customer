"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, QrCode, ShoppingCart, Ticket, Tag, Clock, Flame, CalendarDays, Utensils } from "lucide-react";
import { MainLayout } from "@/components/ui/common";
import { ROUTES } from "@/constants/routes";
import {
  CART_DATA_STORAGE_KEY,
  CART_ID_STORAGE_KEY,
  checkoutBankTransfer,
  getCustomerActiveOrders,
  getAvailablePromotions,
  savePendingBankTransfer,
  clearPendingBankTransfer,
  loadPendingBankTransfer,
  type CartResponse,
  type CheckoutBankTransferResponse,
  type PromotionResponse,
} from "@/services/orderCustomerService";
import { getRestaurantGroupedMenu } from "@/services/menuRestaurantTemplateService";
import type { RestaurantMenuData } from "@/types";

function buildDishImageUrlById(menu: RestaurantMenuData): Record<number, string> {
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
  orderTotal: number
): number {
  if (!promo) return 0;
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
  if (Number.isFinite(promo.minOrderValue) && orderTotal < promo.minOrderValue) return 0;

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

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white px-4 shadow-sm ${className}`}>{children}</div>
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
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    return formatLocalDateTimeForInput(d);
  });
  const [pickupMin, setPickupMin] = useState(() =>
    formatLocalDateTimeForInput(new Date())
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [orderResult, setOrderResult] = useState<CheckoutBankTransferResponse | null>(null);
  const [bankConfirmed, setBankConfirmed] = useState(false);

  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  /** Ảnh món từ API menu (cùng nguồn trang nhà hàng) — dùng khi cart item không có imageUrl */
  const [dishImageUrlById, setDishImageUrlById] = useState<Record<number, string>>({});

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
        const TTL_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.savedAt > TTL_MS) {
          window.localStorage.removeItem(SESSION_RESULT_KEY);
        } else if (parsed.orderResult) {
          setOrderResult(parsed.orderResult);
          setLookupPhone(parsed.phone);
          return;
        }
      }
    } catch { /* ignore */ }

    try {
      const raw = window.localStorage.getItem(CART_DATA_STORAGE_KEY(cartId));
      if (!raw) {
        setCartError("Giỏ hàng đã hết hạn hoặc chưa có dữ liệu.");
        return;
      }
      setCart(JSON.parse(raw) as CartResponse);
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

  const totalItems = useMemo(
    () => cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart]
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
        const best = res.find(p => p.isRecommended);
        if (best) setSelectedPromotionId(best.id);
      } catch (err) {
        console.error("Failed to load promotions", err);
      } finally {
        setLoadingPromotions(false);
      }
    };
    fetchPromotions();
  }, [cart?.totalAmount, restaurantIdParam]);

  useEffect(() => {
    if (!orderResult || bankConfirmed) return;
    const rid = Number(restaurantIdParam);
    if (!rid || !lookupPhone) return;

    let cancelled = false;
    const checkStatus = async () => {
      try {
        const activeOrders = await getCustomerActiveOrders({
          restaurantId: rid,
          phoneNumber: lookupPhone,
        });
        const order = activeOrders.find((o) => o.orderId === orderResult.orderId);
        if (!cancelled && order && order.status >= 1) {
          setBankConfirmed(true);
          clearPendingBankTransfer();
          if (cart?.cartId) {
            window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cart.cartId));
          }
          if (restaurantIdParam) {
            window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantIdParam));
          }
          window.dispatchEvent(
            new CustomEvent("s2o-cart-updated", {
              detail: { restaurantId: restaurantIdParam, cartId: "" },
            })
          );
        }
      } catch {
        // ignore polling errors
      }
    };

    checkStatus();
    const timer = window.setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderResult, bankConfirmed, restaurantIdParam, lookupPhone, cart?.cartId]);

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
      setPickupError("Thời gian nhận đơn không hợp lệ. Vui lòng chọn từ hiện tại trở đi.");
      return;
    }
    setPickupError(null);

    setSubmitting(true);
    setCartError(null);
    try {
      const result = await checkoutBankTransfer({
        cartId: cart.cartId,
        phone: trimmed,
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
          JSON.stringify({ orderResult: result, phone: trimmed, savedAt: Date.now() })
        );
      }

      // Gi\u1ecf h\u00e0ng c\u1ea7n d\u1ecdn s\u1ea1ch ngay khi t\u1ea1o \u0111\u01a1n th\u00e0nh c\u00f4ng
      // \u0111\u1ec3 n\u1ebfu Back v\u1ec1 Menu, kh\u00f4ng gi\u1eef s\u1ed1 l\u01b0\u1ee3ng c\u0169 g\u00e2y l\u1ed7i "h\u1ebft h\u00e0ng"
      window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cart.cartId));
      if (restaurantIdParam) {
        window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantIdParam));
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e as Error)?.message ||
        "Không thể tạo thanh toán chuyển khoản.";
      setCartError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPromo = promotions.find(p => p.id === selectedPromotionId);
  const orderTotal = cart?.totalAmount ?? 0;
  const discountAmount = calcPromotionDiscount(selectedPromo, orderTotal);
  const finalAmount = Math.max(0, orderTotal - discountAmount);
  const effectiveDiscount = Math.max(0, orderTotal - (selectedPromo ? finalAmount : orderTotal));

  return (
    <MainLayout hideHeader hideFooter>
      <div className="min-h-screen w-full bg-white">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-emerald-800">Thanh toán đơn đặt trước</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Thanh toán chuyển khoản và chọn thời gian nhận đơn.
              </p>
            </div>
          </div>
        </div>

        <div className="px-0 py-4">

          {cartError && !orderResult && (
            <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {cartError}
            </div>
          )}

          {!orderResult ? (
            <>
              {cart && (
                <div className="mt-4 rounded-none border-y border-slate-200 bg-slate-50 p-3 sm:mx-auto sm:max-w-3xl sm:rounded-xl sm:border">
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShoppingCart className="h-4 w-4" />
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">{totalItems} món</p>
                    </div>
                  </div>
                  <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-1">
                    {cart.items.map((item) => (
                      <li key={item.dishId} className="flex items-center gap-3 py-2 w-full">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-100/50">
                          <Utensils className="h-5 w-5 text-slate-300" />
                          {(() => {
                            const src =
                              item.imageUrl?.trim() || dishImageUrlById[item.dishId]?.trim();
                            return src ? (
                              <img
                                src={src}
                                alt={item.dishName}
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : null;
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.dishName} <span className="font-bold text-slate-500 ml-0.5">x{item.quantity}</span>
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
                        <span className="shrink-0 font-bold text-slate-900">{formatVND(item.subTotal)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Tổng kết thanh toán (giống trang checkout) */}
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-600">Tổng cộng</span>
                      <span className={selectedPromo ? "text-slate-400 line-through" : "font-bold text-slate-900"}>
                        {formatVND(cart.totalAmount)}
                      </span>
                    </div>

                    {selectedPromo && discountAmount > 0 && (
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-emerald-700">Giảm</span>
                        <span className="font-bold text-emerald-700">- {formatVND(effectiveDiscount)}</span>
                      </div>
                    )}

                    <div className="mt-2 flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                          Tổng thanh toán
                        </span>
                      </div>
                      <span className="text-lg font-extrabold text-slate-900">
                        {formatVND(selectedPromo ? finalAmount : cart.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Khuyến mãi */}
              {cart && (promotions.length > 0 || loadingPromotions) && (
                <div className="mt-4 rounded-none border-y border-slate-200 bg-slate-50 p-3 sm:mx-auto sm:max-w-3xl sm:rounded-xl sm:border">
                  <div className="flex items-center gap-2 mb-3">
                    <Ticket className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-extrabold text-slate-800">Khuyến mãi & Ưu đãi</p>
                    {loadingPromotions && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    {promotions.map(promo => {
                      const isSelected = selectedPromotionId === promo.id;
                      let Icon = Tag;
                      if (promo.type === 1) Icon = Clock;
                      if (promo.type === 2) Icon = Flame;
                      if (promo.type === 3) Icon = CalendarDays;

                      let tagLabel = "";
                      if (promo.discountType === 0) tagLabel = `-${promo.discountValue}%`;
                      else tagLabel = `-${formatVND(promo.discountValue)}`;

                      return (
                        <label
                          key={promo.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                            isSelected ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 bg-white hover:border-slate-200"
                          }`}
                        >
                          <div className="flex h-5 items-center">
                            <input
                              type="radio"
                              name="promotion"
                              checked={isSelected}
                              onChange={() => setSelectedPromotionId(promo.id)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <Icon className={`h-3.5 w-3.5 ${promo.type === 2 ? 'text-rose-500' : promo.type === 1 ? 'text-blue-500' : promo.type === 3 ? 'text-amber-500' : 'text-slate-500'}`} />
                              <p className="text-sm font-bold text-slate-800 break-words">{promo.name}</p>
                              <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                                {tagLabel}
                              </span>
                              {promo.isRecommended && (
                                <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  Tốt nhất
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                              Đơn từ {formatVND(promo.minOrderValue)}
                              {promo.discountType === 0 && promo.maxDiscountValue ? ` • Tối đa ${formatVND(promo.maxDiscountValue)}` : ""}
                            </p>
                            {promo.endDate && (
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                HSD: {new Date(promo.endDate).toLocaleDateString("vi-VN")}
                              </p>
                            )}
                            {promo.type === 1 && promo.dailyEndTime && (
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                Hiệu lực {promo.dailyStartTime?.slice(0, 5)} - {promo.dailyEndTime?.slice(0, 5)}
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
                </div>
              )}

              <div className="mx-4 mt-4 grid grid-cols-1 gap-3 sm:mx-auto sm:max-w-3xl">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Số điện thoại</span>
                  <input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError(null);
                    }}
                    inputMode="tel"
                    placeholder="VD: 0901234567"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-emerald-400"
                  />
                  {phoneError && <p className="mt-1 text-xs font-semibold text-rose-600">{phoneError}</p>}
                </label>

                <label className="block">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
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
                      // Clamp: nếu user nhập quá khứ (hoặc min vừa nhảy lên), tự đẩy về min
                      const nextTime = new Date(next).getTime();
                      const minTime = new Date(pickupMin).getTime();
                      if (Number.isFinite(nextTime) && Number.isFinite(minTime) && nextTime < minTime) {
                        setPickupAt(pickupMin);
                      } else {
                        setPickupAt(next);
                      }
                      setPickupError(null);
                    }}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-emerald-400 invalid:text-slate-400 invalid:border-rose-300 invalid:bg-slate-50"
                  />
                  {pickupError && <p className="mt-1 text-xs font-semibold text-rose-600">{pickupError}</p>}
                </label>
              </div>

              <button
                type="button"
                disabled={submitting || !cart}
                onClick={handleCheckoutBankTransfer}
                className="mx-4 mt-4 inline-flex w-[calc(100%-2rem)] items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:mx-auto sm:w-full sm:max-w-3xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo mã chuyển khoản...
                  </>
                ) : (
                  "Thanh toán chuyển khoản"
                )}
              </button>
            </>
          ) : bankConfirmed ? (
            <div className="mt-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-500 px-4 pb-8 pt-8 text-white">
                <CheckCircle2 className="h-16 w-16" />
                <p className="text-2xl font-extrabold">Đặt hàng thành công!</p>
                <p className="text-sm text-emerald-100">{orderResult.restaurantName}</p>
              </div>

              <div className="-mt-4 flex flex-col gap-3 pb-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-sm font-extrabold text-emerald-900">Thanh toán đã được xác nhận</p>
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
                      {formatVND(orderResult.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-500">SĐT</span>
                    <span className="text-sm font-semibold text-slate-800">{lookupPhone}</span>
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

                <button
                  type="button"
                  onClick={() => router.push(ROUTES.HOME)}
                  className="mt-2 w-full rounded-2xl bg-emerald-500 py-4 text-base font-extrabold text-white shadow-md active:scale-95"
                >
                  Quay về trang chủ
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-blue-500 px-4 pb-8 pt-8 text-white">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                  <QrCode className="h-9 w-9 text-white" />
                </div>
                <p className="text-2xl font-extrabold">Quét mã để thanh toán</p>
                <p className="text-sm text-blue-100">{orderResult.restaurantName}</p>
              </div>

              <div className="-mt-4 flex flex-col gap-3 pb-2">
                {orderResult.qrUrl && (
                  <SectionCard className="flex flex-col items-center gap-2 py-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      QR thanh toán VietQR
                    </p>
                    <img
                      src={orderResult.qrUrl}
                      alt="VietQR"
                      className="h-52 w-52 rounded-xl border border-slate-200 object-contain"
                    />
                  </SectionCard>
                )}

                <SectionCard className="py-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-500">Số tiền</span>
                    <span className="text-base font-extrabold text-blue-600">
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
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      Chờ xác nhận chuyển khoản
                    </span>
                  </div>
                </SectionCard>

                <button
                  type="button"
                  onClick={() => router.push(ROUTES.HOME)}
                  className="mt-2 w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white shadow-md active:scale-95"
                >
                  Quay về trang chủ
                </button>
              </div>
            </div>
          )}
        </div>
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


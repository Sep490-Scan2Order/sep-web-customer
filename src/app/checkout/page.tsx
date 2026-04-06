"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  QrCode,
  ReceiptText,
  ShoppingBag,
  Tag,
  TriangleAlert,
  Flame,
  CalendarDays,
  Ticket,
  Utensils,
} from "lucide-react";
import {
  checkoutBankTransfer,
  checkoutCash,
  getCustomerActiveOrders,
  getAvailablePromotions,
  CART_DATA_STORAGE_KEY,
  CART_ID_STORAGE_KEY,
  savePendingBankTransfer,
  clearPendingBankTransfer,
  clearCartCache,
  loadCartByCartId,
  type CartItem,
  type CartResponse,
  type CheckoutBankTransferResponse,
  type CheckoutCashResponse,
  type PromotionResponse,
} from "@/services/orderCustomerService";

/* ─── Helpers ─── */
function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "đ";
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
function OrderItemRow({ item }: { item: CartItem }) {
  return (
    <div className="flex items-center gap-3 py-3 w-full">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-100/50">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.dishName} 
            className="h-full w-full object-cover"
          />
        ) : (
          <Utensils className="h-5 w-5 text-slate-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {item.dishName} <span className="font-bold text-slate-500 ml-0.5">x{item.quantity}</span>
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
      <p className="shrink-0 text-sm font-bold text-orange-600">{formatVND(item.subTotal)}</p>
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white px-4 shadow-sm ${className}`}>{children}</div>
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

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PayMethod>("cash");
  const [step, setStep] = useState<OrderStep>({ kind: "form" });
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [bankConfirmed, setBankConfirmed] = useState(false);

  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [loadingPromotions, setLoadingPromotions] = useState(false);

  const SESSION_RESULT_KEY = cartId ? `s2o_order_result_${cartId}` : "";

  useEffect(() => {
    if (!cartId) {
      setCartError("Không tìm thấy giỏ hàng. Vui lòng quay lại menu.");
      return;
    }
    try {
      const savedResult = window.localStorage.getItem(SESSION_RESULT_KEY);
      if (savedResult) {
        const parsed = JSON.parse(savedResult) as { step: OrderStep; savedAt: number };
        const TTL_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.savedAt > TTL_MS) {
          window.localStorage.removeItem(SESSION_RESULT_KEY);
        } else if (parsed.step?.kind === "done_cash" || parsed.step?.kind === "done_bank") {
          setStep(parsed.step);
          return;
        }
      }
    } catch { /* ignore */ }
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
    if (step.kind !== "done_cash" || cashConfirmed) return;
    const r = step.result;
    const rid = Number(restaurantIdParam);
    if (!rid || !r.phone) return;
    const checkStatus = async () => {
      try {
        const activeOrders = await getCustomerActiveOrders({
          restaurantId: rid,
          phoneNumber: r.phone,
        });
        const order = activeOrders.find((o) => o.orderId === r.orderId);

        if (order && order.status >= 1) {
          setCashConfirmed(true);
          if (restaurantIdParam) {
            clearCartCache(restaurantIdParam, cartId);
          } else {
            window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
          }
        }
      } catch { /* ignore */ }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [step, cashConfirmed, restaurantIdParam, cartId, restaurantIdParam]);

  useEffect(() => {
    if (step.kind !== "done_bank" || bankConfirmed) return;
    const rid = Number(restaurantIdParam);
    if (!rid || !step.phone) return;
    const checkStatus = async () => {
      try {
        const activeOrders = await getCustomerActiveOrders({
          restaurantId: rid,
          phoneNumber: step.phone,
        });
        const order = activeOrders.find((o) => o.orderId === step.result.orderId);

        if (order && order.status >= 1) {
          setBankConfirmed(true);
          clearPendingBankTransfer();
          if (restaurantIdParam) {
            clearCartCache(restaurantIdParam, cartId);
          } else {
            window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
          }
        }
      } catch { /* ignore */ }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [step, bankConfirmed, restaurantIdParam]);

  const backHref = restaurantSlug ? `/menu?restaurant=${encodeURIComponent(restaurantSlug)}` : "/";
  const isLoading = step.kind === "loading";
  const isDone = step.kind === "done_cash" || step.kind === "done_bank";

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
        const res = await checkoutCash({ cartId, phone: trimmed, appliedPromotionId: selectedPromotionId });
        newStep = { kind: "done_cash", result: res };
      } else {
        const res = await checkoutBankTransfer({ cartId, phone: trimmed, appliedPromotionId: selectedPromotionId });
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
        window.localStorage.setItem(SESSION_RESULT_KEY, JSON.stringify({ step: newStep, savedAt: Date.now() }));
      }
      
      // Ngay khi tạo đơn thành công (Dù chưa thanh toán), giỏ hàng cần dọn sạch 
      // để nếu Back về Menu, nó không giữ số lượng cũ gây lỗi "hết hàng". 
      if (restaurantIdParam) {
        clearCartCache(restaurantIdParam, cartId);
      } else {
        window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
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
        <p className="text-center text-sm font-semibold text-slate-700">{cartError}</p>
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
                <span className="text-3xl font-extrabold text-slate-900">#{r.orderCode}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Tổng tiền</span>
                <span className="text-base font-extrabold text-emerald-600">{formatVND(r.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">SĐT</span>
                <span className="text-sm font-semibold text-slate-800">{r.phone}</span>
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
                  Đưa mã này cho nhân viên quầy
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
              onClick={() => { clearOrderData(); router.push(backHref); }}
              className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Quay về menu
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
              <span className="text-3xl font-extrabold text-slate-900">#{r.orderCode}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">Tổng tiền cần trả</span>
              <span className="text-base font-extrabold text-amber-600">{formatVND(r.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500">SĐT</span>
              <span className="text-sm font-semibold text-slate-800">{r.phone}</span>
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
            onClick={() => { clearOrderData(); router.push(backHref); }}
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
                <span className="text-base font-extrabold text-emerald-600">{formatVND(r.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">SĐT</span>
                <span className="text-sm font-semibold text-slate-800">{step.phone}</span>
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
                  Đưa mã này cho nhân viên quầy
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
              onClick={() => { clearOrderData(); router.push(backHref); }}
              className="mt-2 w-full rounded-2xl bg-orange-500 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Quay về menu
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <div className="flex flex-col items-center gap-3 bg-blue-500 px-4 pb-10 pt-12 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <QrCode className="h-9 w-9 text-white" />
          </div>
          <p className="text-2xl font-extrabold">Quét mã để thanh toán</p>
          <p className="text-sm text-blue-100">{r.restaurantName}</p>
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
              <span className="text-base font-extrabold text-blue-600">{formatVND(r.totalAmount)}</span>
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Chờ xác nhận chuyển khoản
              </span>
            </div>
          </SectionCard>

          <button
            type="button"
            onClick={() => { clearOrderData(); router.push(backHref); }}
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
  const selectedPromo = promotions.find(p => p.id === selectedPromotionId);
  const discountAmount = selectedPromo?.discountAmount ?? 0;
  const finalAmountCalculated = Math.max(0, (cart?.totalAmount ?? 0) - discountAmount);
  const finalAmountRounded = Math.round(finalAmountCalculated / 1000) * 1000;

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
          <p className="text-base font-extrabold text-slate-900">Xác nhận đơn hàng</p>
        </div>
        <ShoppingBag className="h-5 w-5 text-orange-400" />
      </header>

      <div className="flex flex-1 flex-col gap-3 bg-gradient-to-b from-orange-50/50 to-white px-4 py-4 pb-36">
        {/* Danh sách món */}
        <SectionCard>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-extrabold text-slate-800">Đơn hàng của bạn</p>
            </div>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
              {cart.items.length} món
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {cart.items.map((item) => (
              <OrderItemRow key={item.dishId} item={item} />
            ))}
          </div>
          <div className="h-px bg-slate-100" />
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-semibold text-slate-600">Tổng cộng</p>
            <p className="text-lg font-extrabold text-orange-600">{formatVND(cart.totalAmount)}</p>
          </div>
        </SectionCard>

        {/* Khuyến mãi */}
        {(promotions.length > 0 || loadingPromotions) && (
          <SectionCard className="py-3">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="h-4 w-4 text-orange-500" />
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
                      isSelected ? "border-orange-500 bg-orange-50/70" : "border-slate-100 bg-white hover:border-orange-200"
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
                        <Icon className={`h-3.5 w-3.5 ${promo.type === 2 ? 'text-rose-500' : promo.type === 1 ? 'text-blue-500' : promo.type === 3 ? 'text-amber-500' : 'text-slate-500'}`} />
                        <p className="text-sm font-bold text-slate-800 break-words">{promo.name}</p>
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
          </SectionCard>
        )}

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
            <p className="mt-1.5 text-xs font-semibold text-rose-500">{phoneError}</p>
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
                <span className={selectedMethod === m.id ? "text-white" : "text-slate-500"}>
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
                      selectedMethod === m.id ? "text-orange-100" : "text-slate-400"
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
            <span className="font-semibold text-slate-600">Tổng thanh toán</span>
            <div className="flex flex-col items-end">
              {selectedPromo && (
                <span className="text-xs text-slate-400 line-through mb-0.5">{formatVND(cart.totalAmount)}</span>
              )}
              <span className="font-extrabold text-orange-600 text-lg leading-none">{formatVND(finalAmountRounded)}</span>
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

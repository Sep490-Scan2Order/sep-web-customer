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
} from "lucide-react";
import {
  checkoutBankTransfer,
  checkoutCash,
  getCustomerActiveOrders,
  getCustomerOrderHistory,
  CART_DATA_STORAGE_KEY,
  CART_ID_STORAGE_KEY,
  type CartItem,
  type CartResponse,
  type CheckoutBankTransferResponse,
  type CheckoutCashResponse,
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
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
        {item.quantity}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{item.dishName}</p>
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
      <p className="shrink-0 text-sm font-bold text-slate-900">{formatVND(item.subTotal)}</p>
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
      const raw = window.localStorage.getItem(CART_DATA_STORAGE_KEY(cartId));
      if (!raw) { setCartError("Giỏ hàng đã hết hạn. Vui lòng thêm lại."); return; }
      setCart(JSON.parse(raw) as CartResponse);
    } catch {
      setCartError("Không thể đọc dữ liệu giỏ hàng.");
    }
  }, [cartId, SESSION_RESULT_KEY]);

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
          limit: 10,
        });
        let order = activeOrders.find((o) => o.orderId === r.orderId);

        // Fallback: nếu đơn đã vào Served/Cancelled nhưng có thể bị ẩn trong active > 15 phút.
        if (!order) {
          const historyOrders = await getCustomerOrderHistory({
            restaurantId: rid,
            phoneNumber: r.phone,
            limit: 50,
          });
          order = historyOrders.find((o) => o.orderId === r.orderId);
        }

        if (order && order.status >= 1) {
          setCashConfirmed(true);
          window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
          if (restaurantIdParam) window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantIdParam));
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
          limit: 10,
        });
        let order = activeOrders.find((o) => o.orderId === step.result.orderId);

        // Fallback: nếu đơn đã vào Served/Cancelled nhưng có thể bị ẩn trong active > 15 phút.
        if (!order) {
          const historyOrders = await getCustomerOrderHistory({
            restaurantId: rid,
            phoneNumber: step.phone,
            limit: 50,
          });
          order = historyOrders.find((o) => o.orderId === step.result.orderId);
        }

        if (order && order.status >= 1) {
          setBankConfirmed(true);
          window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
          if (restaurantIdParam) window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantIdParam));
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
    window.localStorage.removeItem(CART_DATA_STORAGE_KEY(cartId));
    if (restaurantIdParam) {
      window.localStorage.removeItem(CART_ID_STORAGE_KEY(restaurantIdParam));
    }
    if (SESSION_RESULT_KEY) {
      window.localStorage.removeItem(SESSION_RESULT_KEY);
    }
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
        const res = await checkoutCash({ cartId, phone: trimmed });
        newStep = { kind: "done_cash", result: res };
      } else {
        const res = await checkoutBankTransfer({ cartId, phone: trimmed });
        newStep = { kind: "done_bank", result: res, phone: trimmed };
      }
      setStep(newStep);

      if (SESSION_RESULT_KEY) {
        window.localStorage.setItem(SESSION_RESULT_KEY, JSON.stringify({ step: newStep, savedAt: Date.now() }));
      }
      // cartData và cartId chỉ xóa khi polling xác nhận hoặc user nhấn "Quay về menu"
      // (giữ lại làm safety net phòng SESSION_RESULT_KEY bị miss)
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <AlertCircle className="h-12 w-12 text-rose-400" />
        <p className="text-center text-sm font-semibold text-slate-700">{cartError}</p>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-bold text-white"
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
              className="mt-2 w-full rounded-2xl bg-emerald-500 py-4 text-base font-extrabold text-white shadow-md active:scale-95"
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
            className="mt-2 w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white shadow-md active:scale-95"
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
              className="mt-2 w-full rounded-2xl bg-emerald-500 py-4 text-base font-extrabold text-white shadow-md active:scale-95"
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
            className="mt-2 w-full rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white shadow-md active:scale-95"
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  /* ── Form screen ── */
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-base font-extrabold text-slate-900">Xác nhận đơn hàng</p>
        </div>
        <ShoppingBag className="h-5 w-5 text-slate-400" />
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4 pb-36">
        {/* Danh sách món */}
        <SectionCard>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-extrabold text-slate-800">Đơn hàng của bạn</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
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
            <p className="text-lg font-extrabold text-slate-900">{formatVND(cart.totalAmount)}</p>
          </div>
        </SectionCard>

        {/* Thông tin khách */}
        <SectionCard className="py-3">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
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
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            disabled={isLoading}
          />
          {phoneError && (
            <p className="mt-1.5 text-xs font-semibold text-rose-500">{phoneError}</p>
          )}
        </SectionCard>

        {/* Phương thức thanh toán */}
        <SectionCard className="py-3">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
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
                    ? "border-slate-800 bg-slate-800"
                    : "border-slate-200 bg-white hover:border-slate-300"
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
                      selectedMethod === m.id ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {m.desc}
                  </p>
                </div>
                {selectedMethod === m.id && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-800" />
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
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white px-4 py-3 shadow-2xl">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex items-center justify-between px-1 text-sm">
            <span className="font-semibold text-slate-600">Tổng thanh toán</span>
            <span className="font-extrabold text-slate-900">{formatVND(cart.totalAmount)}</span>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={handlePlaceOrder}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

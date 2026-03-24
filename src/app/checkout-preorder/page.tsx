"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, CheckCircle2, Loader2, QrCode, ShoppingCart } from "lucide-react";
import { MainLayout } from "@/components/ui/common";
import { ROUTES } from "@/constants/routes";
import {
  CART_DATA_STORAGE_KEY,
  CART_ID_STORAGE_KEY,
  checkoutBankTransfer,
  getCustomerActiveOrders,
  type CartResponse,
  type CheckoutBankTransferResponse,
} from "@/services/orderCustomerService";

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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [orderResult, setOrderResult] = useState<CheckoutBankTransferResponse | null>(null);
  const [bankConfirmed, setBankConfirmed] = useState(false);

  useEffect(() => {
    if (!cartId) {
      setCartError("Không tìm thấy giỏ hàng.");
      return;
    }
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
  }, [cartId]);

  const totalItems = useMemo(
    () => cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart]
  );

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
    setPickupError(null);

    setSubmitting(true);
    setCartError(null);
    try {
      const result = await checkoutBankTransfer({
        cartId: cart.cartId,
        phone: trimmed,
      });
      setLookupPhone(trimmed);
      setOrderResult(result);
      setBankConfirmed(false);
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

  return (
    <MainLayout hideHeader hideFooter>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
          <h1 className="text-xl font-extrabold text-emerald-800">Thanh toán đơn đặt trước</h1>
          <p className="mt-1 text-sm text-slate-600">
            Thanh toán chuyển khoản và chọn thời gian nhận đơn.
          </p>

          {cartError && !orderResult && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {cartError}
            </div>
          )}

          {!orderResult ? (
            <>
              {!cartError && cart && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <ShoppingCart className="h-4 w-4" />
                    <p className="text-sm font-semibold">
                      {totalItems} món • {formatVND(cart.totalAmount)}
                    </p>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {cart.items.map((item) => (
                      <li key={item.dishId} className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {item.dishName} x{item.quantity}
                        </span>
                        <span className="shrink-0 font-semibold">{formatVND(item.subTotal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3">
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
                    onChange={(e) => {
                      setPickupAt(e.target.value);
                      setPickupError(null);
                    }}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-emerald-400"
                  />
                  {pickupError && <p className="mt-1 text-xs font-semibold text-rose-600">{pickupError}</p>}
                </label>
              </div>

              <button
                type="button"
                disabled={submitting || !cart}
                onClick={handleCheckoutBankTransfer}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center justify-center px-4 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </MainLayout>
      }
    >
      <CheckoutPreorderContent />
    </Suspense>
  );
}


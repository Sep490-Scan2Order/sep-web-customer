"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { QrCodeModal } from "@/components/ui/common/QrCodeModal";
import {
  getCustomerActiveOrdersAllRestaurants,
  type AllRestaurantOrderSummary,
  type CustomerOrderSummary,
} from "@/services/orderCustomerService";

type CustomerOrder = AllRestaurantOrderSummary;

type ActiveTabKey = number | "refund";

function statusLabel(status: number): string {
  switch (status) {
    case 0:
      return "Chưa thanh toán";
    case 1:
      return "Chờ xử lý";
    case 2:
      return "Đang làm";
    case 3:
      return "Đã xong";
    case 4:
      return "Đã giao";
    case 5:
      return "Đã huỷ";
    default:
      return `Trạng thái ${status}`;
  }
}

function statusTabLabelShort(status: number): string {
  switch (status) {
    case 0:
      return "Chưa TT";
    case 1:
      return "Chờ xử lý";
    case 2:
      return "Đang làm";
    case 3:
      return "Đã xong";
    case 4:
      return "Đã giao";
    case 5:
      return "Đã huỷ";
    default:
      return statusLabel(status);
  }
}

function refundTypeLabel(refundType: number | null | undefined): string {
  if (refundType === 0) return "Theo chính sách / điều chỉnh đơn";
  if (refundType === 1) return "Hoàn do lỗi phía nhà hàng";
  if (refundType === 2) return "Hoàn do lỗi hệ thống";
  return "Hoàn tiền";
}

function isRefundOrder(o: CustomerOrderSummary): boolean {
  return o.isRefundLog === true || Boolean(o.refundOrderId?.trim()) || o.typeOrder === 1;
}

function resolveParentOrderFromList(
  orders: CustomerOrderSummary[],
  refundOrderId: string | null | undefined
): CustomerOrderSummary | null {
  if (!refundOrderId?.trim()) return null;
  const id = refundOrderId.trim().toLowerCase();
  const match = orders.find((x) => x.orderId.toLowerCase() === id);
  if (!match || isRefundOrder(match)) return null;
  return match;
}

function resolveParentOrderCodeFromList(
  orders: CustomerOrderSummary[],
  refundOrderId: string | null | undefined
): number | null {
  return resolveParentOrderFromList(orders, refundOrderId)?.orderCode ?? null;
}

function statusStyle(status: number): {
  section: string;
  dot: string;
  badge: string;
  card: string;
} {
  switch (status) {
    case 0:
      return {
        section: "text-slate-700",
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
        card: "border-slate-200 bg-white",
      };
    case 1:
      return {
        section: "text-amber-800",
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-800 ring-amber-200",
        card: "border-amber-200 bg-white",
      };
    case 2:
      return {
        section: "text-sky-800",
        dot: "bg-sky-500",
        badge: "bg-sky-50 text-sky-800 ring-sky-200",
        card: "border-sky-200 bg-white",
      };
    case 3:
      return {
        section: "text-emerald-800",
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        card: "border-emerald-200 bg-white",
      };
    case 4:
      return {
        section: "text-slate-700",
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
        card: "border-slate-200 bg-white",
      };
    case 5:
      return {
        section: "text-rose-800",
        dot: "bg-rose-500",
        badge: "bg-rose-50 text-rose-800 ring-rose-200",
        card: "border-rose-200 bg-white",
      };
    default:
      return {
        section: "text-slate-700",
        dot: "bg-slate-400",
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
        card: "border-slate-200 bg-white",
      };
  }
}

function formatMoneyVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  } catch {
    return `${amount}₫`;
  }
}

function formatDateTimeVi(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

function renderLinePrice(line: {
  originalPrice: number;
  quantity: number;
  subTotal: number;
  discountedPrice?: number | null;
}): { original: number; discounted: number | null } {
  const originalLineTotal = line.originalPrice * line.quantity;
  const discountedLineTotal = line.subTotal;

  if (
    Number.isFinite(discountedLineTotal) &&
    discountedLineTotal > 0 &&
    discountedLineTotal < originalLineTotal
  ) {
    return { original: originalLineTotal, discounted: discountedLineTotal };
  }
  return {
    original: Number.isFinite(discountedLineTotal) && discountedLineTotal > 0 ? discountedLineTotal : originalLineTotal,
    discounted: null,
  };
}

export type AllRestaurantsOrderLookupDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function AllRestaurantsOrderLookupDrawer({ open, onClose }: AllRestaurantsOrderLookupDrawerProps) {
  const [phoneInput, setPhoneInput] = useState("");
  const [lookupPhone, setLookupPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<CustomerOrder[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<ActiveTabKey>(0);
  const [selectedQr, setSelectedQr] = useState<{ qrCodeUrl: string; orderCode: number } | null>(null);

  const statusTabs = useMemo(() => [0, 1, 2, 3, 4, 5] as const, []);

  const restaurantIds = useMemo(() => {
    const s = new Set<number>();
    allOrders.forEach((o) => {
      const id = Number(o.restaurantId);
      if (Number.isFinite(id)) s.add(id);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [allOrders]);

  const restaurantLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const o of allOrders) {
      const id = Number(o.restaurantId);
      if (!Number.isFinite(id)) continue;
      const name = o.restaurantName?.trim();
      if (name) map.set(id, name);
    }
    return map;
  }, [allOrders]);

  const ordersForRestaurant = useMemo(() => {
    if (selectedRestaurantId == null) return [];
    return allOrders.filter((o) => Number(o.restaurantId) === selectedRestaurantId);
  }, [allOrders, selectedRestaurantId]);

  const hasRefundInList = useMemo(() => ordersForRestaurant.some(isRefundOrder), [ordersForRestaurant]);

  useEffect(() => {
    if (activeTabKey === "refund" && !hasRefundInList) setActiveTabKey(0);
  }, [activeTabKey, hasRefundInList]);

  useEffect(() => {
    if (restaurantIds.length === 0) {
      setSelectedRestaurantId(null);
      return;
    }
    setSelectedRestaurantId((prev) =>
      prev != null && restaurantIds.includes(prev) ? prev : restaurantIds[0]!
    );
  }, [restaurantIds]);

  const visibleOrders = useMemo(() => {
    if (activeTabKey === "refund") {
      return ordersForRestaurant.filter(isRefundOrder);
    }
    const s = activeTabKey as number;
    if (s === 4) {
      return ordersForRestaurant.filter((o) => o.status === 4 && !isRefundOrder(o));
    }
    if (s === 5) {
      return ordersForRestaurant.filter((o) => o.status === 5 && !isRefundOrder(o));
    }
    return ordersForRestaurant.filter((o) => o.status === s);
  }, [ordersForRestaurant, activeTabKey]);

  const hideQrDeliveredOrCancelled = activeTabKey === 4 || activeTabKey === 5;

  const resetDrawerState = useCallback(() => {
    setPhoneInput("");
    setLookupPhone(null);
    setAllOrders([]);
    setError(null);
    setSelectedRestaurantId(null);
    setActiveTabKey(0);
    setSelectedQr(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetDrawerState();
    }
  }, [open, resetDrawerState]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !lookupPhone) return;
    const phone = lookupPhone;
    let cancelled = false;
    async function poll() {
      try {
        const data = await getCustomerActiveOrdersAllRestaurants(phone);
        if (!cancelled) setAllOrders(data);
      } catch {}
    }
    const id = window.setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, lookupPhone]);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    const phone = phoneInput.trim();
    if (!phone) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCustomerActiveOrdersAllRestaurants(phone);
      setAllOrders(data);
      setLookupPhone(phone);
      setActiveTabKey(0);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Không thể tải danh sách đơn.";
      setError(msg);
      setAllOrders([]);
      setLookupPhone(null);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 transition-opacity"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Tra cứu đơn toàn bộ nhà hàng"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-emerald-700 px-4 py-3 text-white">
          <h2 className="text-base font-extrabold tracking-tight">Tra cứu đơn hàng</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <form onSubmit={handleLookup} className="space-y-3">
            <div>
              <label htmlFor="all-rest-lookup-phone" className="block text-sm font-semibold text-slate-800">
                Số điện thoại
              </label>
              <input
                id="all-rest-lookup-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang tra cứu…" : "Tra cứu"}
            </button>
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          </form>

          {lookupPhone && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-600">
                SĐT <span className="font-semibold text-slate-900">{lookupPhone}</span>
              </p>

              {restaurantIds.length === 0 ? (
                <p className="text-sm text-slate-600">Không có đơn nào cho số này.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl bg-slate-50 p-1">
                    <div className="flex min-w-max flex-nowrap gap-1">
                      {restaurantIds.map((rid) => {
                        const count = allOrders.filter((o) => Number(o.restaurantId) === rid).length;
                        const isActive = selectedRestaurantId === rid;
                        const label = restaurantLabelById.get(rid) ?? `Nhà hàng #${rid}`;
                        return (
                          <button
                            key={rid}
                            type="button"
                            onClick={() => setSelectedRestaurantId(rid)}
                            className={`flex flex-shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
                              isActive
                                ? "bg-orange-500 text-white shadow-sm"
                                : "bg-transparent text-slate-600 hover:bg-white"
                            }`}
                          >
                            <span className="max-w-[11rem] truncate whitespace-nowrap sm:max-w-[14rem]" title={label}>
                              {label}
                            </span>
                            <span
                              className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedRestaurantId != null && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="mb-3 overflow-x-auto rounded-xl bg-slate-50 p-1">
                        <div className="flex min-w-max flex-nowrap gap-1">
                          {statusTabs.map((s) => {
                            const sStyle = statusStyle(s);
                            const count =
                              s === 4
                                ? ordersForRestaurant.filter((o) => o.status === 4 && !isRefundOrder(o)).length
                                : s === 5
                                  ? ordersForRestaurant.filter((o) => o.status === 5 && !isRefundOrder(o)).length
                                  : ordersForRestaurant.filter((o) => o.status === s).length;
                            const isActive = activeTabKey === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setActiveTabKey(s)}
                                className={`flex flex-shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
                                  isActive
                                    ? "bg-orange-500 text-white shadow-sm"
                                    : "bg-transparent text-slate-600 hover:bg-white"
                                }`}
                              >
                                <span className="flex items-center gap-2 whitespace-nowrap">
                                  <span className={`h-2.5 w-2.5 rounded-full ${sStyle.dot}`} />
                                  <span className="whitespace-nowrap">{statusTabLabelShort(s)}</span>
                                </span>
                                <span
                                  className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                          {hasRefundInList && (
                            <button
                              type="button"
                              onClick={() => setActiveTabKey("refund")}
                              className={`flex flex-shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
                                activeTabKey === "refund"
                                  ? "bg-orange-500 text-white shadow-sm"
                                  : "bg-transparent text-slate-600 hover:bg-white"
                              }`}
                            >
                              <span className="flex items-center gap-2 whitespace-nowrap">
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                                <span className="whitespace-nowrap">Hoàn tiền</span>
                              </span>
                              <span
                                className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                                  activeTabKey === "refund"
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {ordersForRestaurant.filter(isRefundOrder).length}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {visibleOrders.length === 0 ? (
                        <p className="text-sm text-slate-600">Không có đơn ở trạng thái này.</p>
                      ) : (
                        <ul className="grid grid-cols-1 gap-3">
                          {visibleOrders.map((o) => {
                            const styles = statusStyle(o.status);
                            const isRefund = isRefundOrder(o);
                            const onRefundTab = activeTabKey === "refund";
                            const showRefundBadge = isRefund && !onRefundTab;
                            const createdText = (() => {
                              try {
                                return new Date(o.createdAt).toLocaleString("vi-VN");
                              } catch {
                                return o.createdAt;
                              }
                            })();

                            if (isRefund) {
                              const parentOrder = resolveParentOrderFromList(ordersForRestaurant, o.refundOrderId);
                              const parentOrderCode = parentOrder?.orderCode ?? null;
                              const parentCreatedText =
                                parentOrder?.createdAt != null && String(parentOrder.createdAt).trim() !== ""
                                  ? formatDateTimeVi(parentOrder.createdAt)
                                  : null;
                              const amountFromParent =
                                parentOrder != null && Number.isFinite(parentOrder.finalAmount)
                                  ? parentOrder.finalAmount
                                  : null;
                              const displayRefundAmount =
                                amountFromParent != null
                                  ? amountFromParent
                                  : o.finalAmount > 0 && Number.isFinite(o.finalAmount)
                                    ? o.finalAmount
                                    : null;
                              return (
                                <li key={o.orderId}>
                                  <div className="w-full rounded-2xl border border-violet-200 bg-violet-50/40 p-3 shadow-sm">
                                    <div className="flex flex-col gap-2">
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                                          Hoàn tiền
                                        </p>
                                        {parentOrderCode != null ? (
                                          <>
                                            <p className="mt-1 text-lg font-extrabold leading-snug text-slate-900">
                                              Hoàn cho đơn #{parentOrderCode}
                                            </p>
                                            {parentCreatedText && (
                                              <p className="mt-1 text-sm text-slate-600">
                                                <span className="font-semibold text-slate-700">Đơn đặt lúc: </span>
                                                {parentCreatedText}
                                              </p>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <p className="mt-1 text-lg font-extrabold leading-snug text-slate-900">
                                              Hoàn tiền đã xử lý
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                              Chưa tìm thấy đơn gốc trong danh sách vừa tải (có thể đơn nằm ngoài phần
                                              hiển thị). Bạn có thể xem tab <strong>Đã giao</strong> hoặc liên hệ cửa
                                              hàng khi cần.
                                            </p>
                                          </>
                                        )}
                                      </div>

                                      <p className="text-sm text-slate-700">
                                        <span className="font-semibold text-slate-800">Lý do: </span>
                                        {refundTypeLabel(o.refundType)}
                                      </p>
                                      <p className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-700">Ghi nhận hoàn lúc: </span>
                                        {createdText}
                                      </p>

                                      <div className="mt-1 space-y-2 border-t border-violet-100 pt-2">
                                        {displayRefundAmount != null ? (
                                          <p className="text-sm font-bold text-slate-900">
                                            <span className="font-semibold text-slate-600">Số tiền tương ứng đơn đặt: </span>
                                            {formatMoneyVnd(displayRefundAmount)}
                                          </p>
                                        ) : (
                                          <p className="text-sm text-slate-600">
                                            Không lấy được giá trị đơn gốc trong danh sách — vui lòng xem tab{" "}
                                            <strong>Đã giao</strong> / <strong>Đã huỷ</strong> hoặc hỏi cửa hàng.
                                          </p>
                                        )}
                                        <p className="text-sm leading-relaxed text-slate-600">
                                          Tiền sẽ được hoàn <strong>bằng tiền mặt</strong> hoặc{" "}
                                          <strong>chuyển khoản</strong> tùy cách bạn đã thanh toán lúc đặt món.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            }

                            return (
                              <li key={o.orderId}>
                                <div className={`w-full rounded-2xl border p-3 shadow-sm ${styles.card}`}>
                                  <div
                                    className={
                                      hideQrDeliveredOrCancelled
                                        ? "flex flex-col gap-3"
                                        : "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                                    }
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-extrabold text-slate-900">Đơn #{o.orderCode}</p>
                                        {showRefundBadge && (
                                          <span
                                            className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 ring-1 ring-violet-200"
                                            title={
                                              (() => {
                                                const code = resolveParentOrderCodeFromList(
                                                  ordersForRestaurant,
                                                  o.refundOrderId
                                                );
                                                return code != null
                                                  ? `Hoàn cho đơn #${code} • ${refundTypeLabel(o.refundType)}`
                                                  : refundTypeLabel(o.refundType);
                                              })()
                                            }
                                          >
                                            Hoàn tiền
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 text-sm text-slate-600">Tạo lúc: {createdText}</p>

                                      {Array.isArray(o.orderDetails) && o.orderDetails.length > 0 && (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                                            Món đã đặt
                                          </p>
                                          <ul className="mt-2 space-y-2">
                                            {o.orderDetails.map((d) => {
                                              const price = renderLinePrice(d);
                                              return (
                                                <li
                                                  key={`${o.orderId}-${d.dishId}`}
                                                  className="flex items-start justify-between gap-3"
                                                >
                                                  <div className="flex min-w-0 items-start gap-2">
                                                    {d.imageUrl ? (
                                                      <img
                                                        src={d.imageUrl}
                                                        alt={d.dishName}
                                                        className="mt-0.5 h-10 w-10 rounded-lg border border-slate-200 bg-white object-cover"
                                                        loading="lazy"
                                                      />
                                                    ) : (
                                                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-400">
                                                        Ảnh
                                                      </div>
                                                    )}
                                                    <div className="min-w-0">
                                                      <p className="truncate text-sm font-semibold text-slate-900">
                                                        {d.dishName}
                                                      </p>
                                                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                        x {d.quantity}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="shrink-0 text-right">
                                                    {price.discounted != null ? (
                                                      <div className="space-x-2">
                                                        <span className="text-xs font-semibold text-slate-400 line-through">
                                                          {formatMoneyVnd(price.original)}
                                                        </span>
                                                        <span className="text-sm font-extrabold text-slate-900">
                                                          {formatMoneyVnd(price.discounted)}
                                                        </span>
                                                      </div>
                                                    ) : (
                                                      <span className="text-sm font-extrabold text-slate-900">
                                                        {formatMoneyVnd(price.original)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}

                                      <div
                                        className={
                                          hideQrDeliveredOrCancelled
                                            ? "mt-3 text-sm text-slate-800"
                                            : "mt-3 grid grid-cols-1 gap-1 text-sm text-slate-800 sm:grid-cols-2"
                                        }
                                      >
                                        <p className="font-bold">
                                          <span className="font-semibold text-slate-500">Tổng cộng:</span>{" "}
                                          {formatMoneyVnd(o.finalAmount)}
                                        </p>
                                        {!hideQrDeliveredOrCancelled && (
                                          <p className="sm:text-right">
                                            {o.qrCodeUrl ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setSelectedQr({ qrCodeUrl: o.qrCodeUrl, orderCode: o.orderCode })
                                                }
                                                className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800"
                                              >
                                                Xem mã QR
                                              </button>
                                            ) : (
                                              <span className="text-slate-400">Không có mã QR</span>
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {!hideQrDeliveredOrCancelled && (
                                      <div className="sm:text-right">
                                        {o.qrCodeUrl ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setSelectedQr({ qrCodeUrl: o.qrCodeUrl, orderCode: o.orderCode })
                                            }
                                            className="rounded-2xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                                            aria-label={`Mở mã QR đơn #${o.orderCode}`}
                                          >
                                            <img
                                              src={o.qrCodeUrl}
                                              alt={`QR đơn #${o.orderCode}`}
                                              className="h-24 w-24 rounded-2xl border border-slate-200 bg-white object-cover"
                                              loading="lazy"
                                            />
                                          </button>
                                        ) : (
                                          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-400">
                                            Không có QR
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <QrCodeModal
        open={selectedQr != null}
        onClose={() => setSelectedQr(null)}
        qrCodeUrl={selectedQr?.qrCodeUrl ?? ""}
        orderCode={selectedQr?.orderCode}
        overlayClassName="z-[80]"
      />
    </>
  );
}

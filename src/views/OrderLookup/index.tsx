"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { ArrowLeft } from "lucide-react";
import { OrderDetailLineList } from "@/components/orderLookup/OrderDetailLineList";
import { MainLayout, QrCodeModal } from "@/components/ui/common";
import { getCustomerActiveOrders, type CustomerOrderSummary } from "@/services/orderCustomerService";
import { getSignalRHubUrl } from "@/services/signalr";
import {
  isRefundLogEntry,
  orderDetailsSectionTitle,
  resolveParentOrderFromList,
  shouldShowOriginalFinalStrike,
} from "@/utils/customerOrderLookupDisplay";

type CustomerUpdateStatusPayload = {
  orderId: string;
  status: number;
};

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

function refundTypeLabel(refundType: number | null | undefined): string {
  // Backend enum (theo mô tả): SystemError / Objective / StaffError
  if (refundType === 0) return "Lỗi hệ thống";
  if (refundType === 1) return "Lỗi khách quan phía nhà hàng";
  if (refundType === 2) return "Lỗi nhân viên";
  return "Hoàn tiền";
}

type ActiveTabKey = number | "refund";

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

function isRenderableQrUrl(url?: string | null): boolean {
  const u = url?.trim();
  if (!u) return false;
  if (u === "REFUND_LOG") return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:");
}

export default function OrderLookupView() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId") ?? "";
  const restaurantSlug = searchParams.get("restaurantSlug") ?? "";
  const phoneNumber = searchParams.get("phoneNumber") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Toàn bộ đơn từ GET .../customer/orders/active (một API; lọc theo tab). */
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [selectedQr, setSelectedQr] = useState<{ qrCodeUrl: string; orderCode: number } | null>(null);

  const connectionRef = useRef<HubConnection | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const visibleOrderIdsRef = useRef<string[]>([]);

  const statusTabs = useMemo(() => [0, 1, 2, 3, 4, 5] as const, []);
  const hasRefundInList = useMemo(() => orders.some(isRefundLogEntry), [orders]);

  const [activeTabKey, setActiveTabKey] = useState<ActiveTabKey>(0);

  /** Khi mất hết bản ghi hoàn tiền (reload), thoát khỏi tab refund nếu đang chọn. */
  useEffect(() => {
    if (activeTabKey === "refund" && !hasRefundInList) setActiveTabKey(0);
  }, [activeTabKey, hasRefundInList]);

  const visibleOrders = useMemo(() => {
    if (activeTabKey === "refund") {
      return orders.filter(isRefundLogEntry);
    }
    const s = activeTabKey as number;
    if (s === 4) {
      return orders.filter((o) => o.status === 4 && !isRefundLogEntry(o));
    }
    if (s === 5) {
      return orders.filter((o) => o.status === 5 && !isRefundLogEntry(o));
    }
    return orders.filter((o) => o.status === s && !isRefundLogEntry(o));
  }, [orders, activeTabKey]);

  useEffect(() => {
    visibleOrderIdsRef.current = visibleOrders.map((o) => o.orderId).filter(Boolean);
  }, [visibleOrders]);

  // Note: UI giờ chỉ render theo selectedStatus, không còn grouped theo tab.

  /** Đã giao / Đã huỷ: không hiển thị QR. */
  const hideQrDeliveredOrCancelled = activeTabKey === 4 || activeTabKey === 5;

  const backHref = restaurantSlug
    ? `/restaurants/${encodeURIComponent(restaurantSlug)}`
    : restaurantId
    ? `/restaurant/${encodeURIComponent(restaurantId)}`
    : "/";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!restaurantId || !phoneNumber) {
        setOrders([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getCustomerActiveOrders({ restaurantId, phoneNumber });
        if (!cancelled) {
          setOrders(data);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Không thể tải danh sách đơn.";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, phoneNumber]);

  // Trang tra cứu: làm mới định kỳ để bắt cập nhật trạng thái đơn.
  useEffect(() => {
    if (!restaurantId || !phoneNumber) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await getCustomerActiveOrders({ restaurantId, phoneNumber });
        if (!cancelled) setOrders(data);
      } catch {
        // bỏ qua lỗi polling để không làm UI nhảy liên tục
      }
    }

    const interval = window.setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [restaurantId, phoneNumber]);

  useEffect(() => {
    let stopped = false;

    async function startConnection() {
      if (connectionRef.current) return;
      const hubUrl = getSignalRHubUrl();
      const conn = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(process.env.NODE_ENV === "development" ? LogLevel.Information : LogLevel.Warning)
        .build();

      conn.on("CustomerUpdateStatus", (payload: CustomerUpdateStatusPayload) => {
        const p: unknown =
          typeof payload === "string"
            ? (() => {
                try {
                  return JSON.parse(payload);
                } catch {
                  return null;
                }
              })()
            : payload;

        const orderId =
          (p as { orderId?: string })?.orderId || (p as { OrderId?: string })?.OrderId;
        const status =
          (p as { status?: number })?.status ?? (p as { Status?: number })?.Status;

        if (!orderId || typeof status !== "number") return;
        setOrders((prev) =>
          prev.map((o) => (o.orderId === orderId ? { ...o, status } : o))
        );
      });

      async function joinAllFromRef() {
        if (conn.state !== "Connected") return;
        const ids = visibleOrderIdsRef.current;
        await Promise.all(ids.map((id) => conn.invoke("JoinOrderGroup", id).catch(() => undefined)));
      }

      conn.onreconnected(() => {
        joinAllFromRef();
      });

      connectionRef.current = conn;

      try {
        startPromiseRef.current = conn.start();
        await startPromiseRef.current;
        await joinAllFromRef();
      } catch {
        // ignore: UI vẫn hiển thị được list, realtime có thể không chạy
      }
    }

    startConnection();
    return () => {
      if (stopped) return;
      stopped = true;
      const conn = connectionRef.current;
      connectionRef.current = null;
      startPromiseRef.current = null;
      if (conn) conn.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    async function joinAllOnListChange() {
      const conn = connectionRef.current;
      if (!conn) return;
      if (startPromiseRef.current) {
        try {
          await startPromiseRef.current;
        } catch {
          return;
        }
      }
      if (conn.state !== "Connected") return;
      const ids = visibleOrderIdsRef.current;
      await Promise.all(ids.map((id) => conn.invoke("JoinOrderGroup", id).catch(() => undefined)));
    }

    joinAllOnListChange();
  }, [visibleOrders.length]);

  return (
    <MainLayout hideHeader hideFooter>
      <div className="flex min-h-[100dvh] flex-col bg-white px-0 py-0 sm:min-h-screen sm:bg-[#ECECEC] sm:px-4 sm:py-6 lg:px-6">
        <div className="mx-auto flex w-full flex-1 flex-col bg-white p-3 sm:max-w-4xl sm:rounded-2xl sm:border sm:border-slate-200 sm:p-4 sm:shadow-sm lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Đơn hàng của bạn</h1>
              <p className="mt-1 text-sm text-slate-600">
                SĐT <span className="font-semibold">{phoneNumber || "—"}</span>
              </p>
            </div>
            <Link
              href={backHref}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm hover:bg-orange-50"
              aria-label="Quay về nhà hàng"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-3 overflow-x-auto rounded-xl bg-slate-50 p-1">
              <div className="flex min-w-max flex-nowrap gap-1">
                <>
                  {statusTabs.map((s) => {
                    const sStyle = statusStyle(s);
                    const count =
                      s === 4
                        ? orders.filter((o) => o.status === 4 && !isRefundLogEntry(o)).length
                        : s === 5
                          ? orders.filter((o) => o.status === 5 && !isRefundLogEntry(o)).length
                          : orders.filter((o) => o.status === s && !isRefundLogEntry(o)).length;
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
                          <span className="whitespace-nowrap">{statusLabel(s)}</span>
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
                        {orders.filter(isRefundLogEntry).length}
                      </span>
                    </button>
                  )}
                </>
              </div>
            </div>

            {!restaurantId || !phoneNumber ? (
              <p className="text-sm text-slate-600">
                Thiếu thông tin tra cứu. Vui lòng quay lại trang nhà hàng và nhập SĐT.
              </p>
            ) : loading ? (
              <p className="text-sm text-slate-600">Đang tải danh sách đơn…</p>
            ) : error ? (
              <p className="text-sm font-semibold text-rose-600">{error}</p>
            ) : visibleOrders.length === 0 ? (
              <p className="text-sm text-slate-600">Không có đơn ở trạng thái này.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3">
                {visibleOrders.map((o) => {
                  const styles = statusStyle(o.status);
                  const isRefund = isRefundLogEntry(o);
                  const createdText = (() => {
                    try {
                      return new Date(o.createdAt).toLocaleString("vi-VN");
                    } catch {
                      return o.createdAt;
                    }
                  })();

                  if (isRefund) {
                    const parentOrder = resolveParentOrderFromList(orders, o.refundOrderId);
                    const parentOrderCode = parentOrder?.orderCode ?? null;
                    const parentCreatedText =
                      parentOrder?.createdAt != null && String(parentOrder.createdAt).trim() !== ""
                        ? formatDateTimeVi(parentOrder.createdAt)
                        : null;
                    const slipDetails = Array.isArray(o.orderDetails) ? o.orderDetails : [];
                    return (
                      <li key={o.orderId}>
                        <div className="w-full rounded-2xl border border-violet-200 bg-violet-50/40 p-3 shadow-sm">
                          <div className="flex flex-col gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                                Phiếu hoàn tiền
                              </p>
                              {parentOrderCode != null ? (
                                <>
                                  <p className="mt-1 text-lg font-extrabold leading-snug text-slate-900">
                                    Liên quan đơn #{parentOrderCode}
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
                                    Chưa tìm thấy đơn gốc trong danh sách vừa tải (có thể đơn nằm ngoài phần hiển thị).
                                    Bạn có thể xem tab <strong>Đã giao</strong> hoặc liên hệ cửa hàng khi cần.
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
                              <p className="text-sm font-bold text-slate-900">
                                <span className="font-semibold text-slate-600">Số tiền hoàn (lần này): </span>
                                {formatMoneyVnd(Number.isFinite(o.finalAmount) ? o.finalAmount : 0)}
                              </p>
                              {slipDetails.length > 0 && (
                                <div className="rounded-xl border border-violet-100 bg-white/70 px-2.5 py-2">
                                  <p className="mb-0.5 text-xs font-extrabold uppercase tracking-wide text-violet-800">
                                    {orderDetailsSectionTitle(true)}
                                  </p>
                                  <ul className="mt-1 space-y-0">
                                    <OrderDetailLineList
                                      order={o}
                                      lines={slipDetails}
                                      ctx="refund_log"
                                      formatMoneyVnd={formatMoneyVnd}
                                    />
                                  </ul>
                                </div>
                              )}
                              <p className="text-sm leading-relaxed text-slate-600">
                                Tiền sẽ được hoàn <strong>bằng tiền mặt</strong> hoặc <strong>chuyển khoản</strong> tùy
                                cách bạn đã thanh toán lúc đặt món.
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  const displayDetails = Array.isArray(o.orderDetails) ? o.orderDetails : [];

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
                            </div>

                            <p className="mt-1 text-sm text-slate-600">Tạo lúc: {createdText}</p>

                            {displayDetails.length > 0 && (
                              <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                                <p className="mb-0.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                                  {orderDetailsSectionTitle(false)}
                                </p>
                                <ul className="mt-1 space-y-0">
                                  <OrderDetailLineList
                                    order={o}
                                    lines={displayDetails}
                                    ctx="original"
                                    formatMoneyVnd={formatMoneyVnd}
                                  />
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
                                <span className="font-semibold text-slate-500">Tổng đơn:</span>{" "}
                                {shouldShowOriginalFinalStrike(o) ? (
                                  <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="text-sm font-extrabold text-slate-900">
                                      {formatMoneyVnd(o.finalAmount)}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400 line-through">
                                      trước hoàn {formatMoneyVnd(o.originalFinalAmount ?? o.finalAmount)}
                                    </span>
                                  </span>
                                ) : (
                                  formatMoneyVnd(o.finalAmount)
                                )}
                              </p>
                              {!hideQrDeliveredOrCancelled && (
                                <p className="sm:text-right">
                                  {isRenderableQrUrl(o.qrCodeUrl) ? (
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
                              {isRenderableQrUrl(o.qrCodeUrl) ? (
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
        </div>

        <QrCodeModal
          open={selectedQr != null}
          onClose={() => setSelectedQr(null)}
          qrCodeUrl={selectedQr?.qrCodeUrl ?? ""}
          orderCode={selectedQr?.orderCode}
        />
      </div>
    </MainLayout>
  );
}


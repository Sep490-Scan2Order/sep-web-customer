"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { ArrowLeft } from "lucide-react";
import { MainLayout, QrCodeModal } from "@/components/ui/common";
import { getCustomerOrders, type CustomerOrderSummary } from "@/services/orderCustomerService";
import { getSignalRHubUrl } from "@/services/signalr";

type CustomerUpdateStatusPayload = {
  orderId: string;
  status: number;
};

function statusLabel(status: number): string {
  switch (status) {
    case 0:
      return "Chưa thanh toán";
    case 1:
      return "Đang chờ";
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

function isHiddenAfterOneHour(order: CustomerOrderSummary, nowMs: number): boolean {
  const isServedOrCancelled = order.status === 4 || order.status === 5;
  if (!isServedOrCancelled) return false;
  const createdMs = Date.parse(order.createdAt);
  if (Number.isNaN(createdMs)) return false;
  return nowMs - createdMs > 60 * 60 * 1000;
}

function formatMoneyVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  } catch {
    return `${amount}₫`;
  }
}

function renderLinePrice(line: {
  originalPrice: number;
  discountedPrice?: number | null;
}): { original: number; discounted: number | null } {
  const d = line.discountedPrice;
  if (typeof d === "number" && Number.isFinite(d) && d >= 0 && d < line.originalPrice) {
    return { original: line.originalPrice, discounted: d };
  }
  return { original: line.originalPrice, discounted: null };
}

export default function OrderLookupView() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId") ?? "";
  const restaurantSlug = searchParams.get("restaurantSlug") ?? "";
  const phoneNumber = searchParams.get("phoneNumber") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [selectedQr, setSelectedQr] = useState<{ qrCodeUrl: string; orderCode: number } | null>(null);

  const connectionRef = useRef<HubConnection | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const visibleOrderIdsRef = useRef<string[]>([]);

  const visibleOrders = useMemo(() => {
    const nowMs = Date.now();
    return orders.filter((o) => !isHiddenAfterOneHour(o, nowMs));
  }, [orders]);

  useEffect(() => {
    visibleOrderIdsRef.current = visibleOrders.map((o) => o.orderId).filter(Boolean);
  }, [visibleOrders]);

  const groupedOrders = useMemo(() => {
    const groups: Record<number, CustomerOrderSummary[]> = {};
    for (const o of visibleOrders) {
      (groups[o.status] ||= []).push(o);
    }

    const order = [1, 2, 3, 0, 4, 5];
    return order
      .map((status) => ({ status, items: (groups[status] ?? []).slice() }))
      .filter((g) => g.items.length > 0);
  }, [visibleOrders]);

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
        const data = await getCustomerOrders({
          restaurantId,
          phoneNumber,
          limit: 20,
        });
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
          {!restaurantId || !phoneNumber ? (
            <p className="text-sm text-slate-600">
              Thiếu thông tin tra cứu. Vui lòng quay lại trang nhà hàng và nhập SĐT.
            </p>
          ) : loading ? (
            <p className="text-sm text-slate-600">Đang tải danh sách đơn…</p>
          ) : error ? (
            <p className="text-sm font-semibold text-rose-600">{error}</p>
          ) : visibleOrders.length === 0 ? (
            <p className="text-sm text-slate-600">Không có đơn nào gần đây để theo dõi.</p>
          ) : (
            <div className="space-y-4">
              {groupedOrders.map((g) => {
                const s = statusStyle(g.status);
                return (
                  <section key={g.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                        <p className={`text-sm font-extrabold ${s.section}`}>{statusLabel(g.status)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {g.items.length}
                      </span>
                    </div>

                    <ul className="grid grid-cols-1 gap-3">
                      {g.items.map((o) => {
                        const styles = statusStyle(o.status);
                        const createdText = (() => {
                          try {
                            return new Date(o.createdAt).toLocaleString("vi-VN");
                          } catch {
                            return o.createdAt;
                          }
                        })();
                        return (
                          <li key={o.orderId}>
                            <div className={`w-full rounded-2xl border p-3 shadow-sm ${styles.card}`}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-extrabold text-slate-900">
                                      Đơn #{o.orderCode}
                                    </p>
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
                                            <li key={`${o.orderId}-${d.dishId}`} className="flex items-start justify-between gap-3">
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

                                  <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-slate-800 sm:grid-cols-2">
                                    <p className="font-bold">
                                      <span className="font-semibold text-slate-500">Tổng cộng:</span>{" "}
                                      {formatMoneyVnd(o.finalAmount)}
                                    </p>
                                    <p className="sm:text-right">
                                      {o.qrCodeUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedQr({ qrCodeUrl: o.qrCodeUrl, orderCode: o.orderCode })}
                                          className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800"
                                        >
                                          Xem mã QR
                                        </button>
                                      ) : (
                                        <span className="text-slate-400">Không có mã QR</span>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="sm:text-right">
                                  {o.qrCodeUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedQr({ qrCodeUrl: o.qrCodeUrl, orderCode: o.orderCode })}
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
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
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


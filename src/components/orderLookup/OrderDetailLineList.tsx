"use client";

import type { CustomerOrderSummary } from "@/services/orderCustomerService";
import {
  formatOriginalLineQuantityCaption,
  lineAmountsForDisplay,
  originalLineHasRefund,
  type CustomerOrderDetailLine,
} from "@/utils/customerOrderLookupDisplay";

type OrderDetailLineListProps = {
  order: CustomerOrderSummary;
  lines: CustomerOrderDetailLine[];
  ctx: "original" | "refund_log";
  formatMoneyVnd: (amount: number) => string;
};

function compactLineQuantity(d: CustomerOrderDetailLine): number {
  if (typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity)) return d.orderedQuantity;
  if (typeof d.quantity === "number" && Number.isFinite(d.quantity)) return d.quantity;
  return 0;
}

export function OrderDetailLineList({ order, lines, ctx, formatMoneyVnd }: OrderDetailLineListProps) {
  return (
    <>
      {lines.map((d, idx) => {
        const amounts = lineAmountsForDisplay(d, ctx);
        const showRefundQtyDetail = ctx === "original" && originalLineHasRefund(d);
        let detailCaption: string | null = null;
        if (showRefundQtyDetail) {
          detailCaption = formatOriginalLineQuantityCaption(d);
          if (!detailCaption) {
            const ref =
              typeof d.refundedQuantity === "number" && Number.isFinite(d.refundedQuantity)
                ? d.refundedQuantity
                : 0;
            const q = typeof d.quantity === "number" && Number.isFinite(d.quantity) ? d.quantity : 0;
            detailCaption = `Đã hoàn ${ref} · Còn ${q}`;
          }
        }
        let refundLogCaption: string | null = null;
        if (ctx === "refund_log") {
          if (typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity)) {
            refundLogCaption = `Hoàn ${d.orderedQuantity} phần`;
          } else if (d.quantity > 0) {
            refundLogCaption = `Hoàn ${d.quantity} phần`;
          }
        }
        const lineFullyRefunded =
          ctx === "original" &&
          typeof d.quantity === "number" &&
          Number.isFinite(d.quantity) &&
          d.quantity === 0;

        return (
          <li
            key={`${order.orderId}-${d.dishId}-${idx}`}
            className="flex items-start justify-between gap-2 py-0.5"
          >
            <div className="flex min-w-0 items-start gap-2">
              {d.imageUrl ? (
                <img
                  src={d.imageUrl}
                  alt={d.dishName}
                  className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-cover sm:h-10 sm:w-10"
                  loading="lazy"
                />
              ) : (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-400 sm:h-10 sm:w-10">
                  Ảnh
                </div>
              )}
              <div className="min-w-0 leading-tight">
                {ctx === "original" && !showRefundQtyDetail ? (
                  <p className="truncate text-sm font-semibold text-slate-900">
                    <span>{d.dishName}</span>
                    <span className="font-semibold text-slate-500"> ×{compactLineQuantity(d)}</span>
                  </p>
                ) : (
                  <>
                    <p className="truncate text-sm font-semibold text-slate-900">{d.dishName}</p>
                    {ctx === "original" && showRefundQtyDetail && detailCaption && (
                      <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-500">
                        {detailCaption}
                        {lineFullyRefunded && (
                          <span className="ml-1 font-bold text-rose-700">· Đã hoàn hết</span>
                        )}
                      </p>
                    )}
                    {ctx === "refund_log" && refundLogCaption && (
                      <p className="mt-0.5 text-[11px] font-semibold leading-snug text-violet-800">
                        {refundLogCaption}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {amounts.struck != null ? (
                <div className="space-x-2">
                  <span className="text-xs font-semibold text-slate-400 line-through">
                    {formatMoneyVnd(amounts.struck)}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">{formatMoneyVnd(amounts.main)}</span>
                </div>
              ) : (
                <span className="text-sm font-extrabold text-slate-900">{formatMoneyVnd(amounts.main)}</span>
              )}
            </div>
          </li>
        );
      })}
    </>
  );
}

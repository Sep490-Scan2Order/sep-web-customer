"use client";

import type { CustomerOrderSummary } from "@/services/orderCustomerService";
import { type CustomerOrderDetailLine } from "@/utils/customerOrderLookupDisplay";

type OrderDetailLineListProps = {
  order: CustomerOrderSummary;
  /** Đơn gốc tương ứng (chỉ dùng khi ctx="refund_log" để lấy giá lúc mua). */
  parentOrder?: CustomerOrderSummary | null;
  lines: CustomerOrderDetailLine[];
  /** original: hiển thị như lúc mua (trước hoàn). refund_log: hiển thị lúc mua -> hoàn. */
  ctx: "original" | "refund_log";
  formatMoneyVnd: (amount: number) => string;
};

function compactLineQuantity(d: CustomerOrderDetailLine): number {
  if (typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity)) return d.orderedQuantity;
  if (typeof d.quantity === "number" && Number.isFinite(d.quantity)) return d.quantity;
  return 0;
}

function findParentLineByDishId(parent: CustomerOrderSummary | null | undefined, dishId: number) {
  const list = Array.isArray(parent?.orderDetails) ? parent!.orderDetails! : [];
  return list.find((x) => x.dishId === dishId) ?? null;
}

function lineAmountAsPurchased(d: CustomerOrderDetailLine): number {
  const purchasedSub =
    typeof d.originalSubTotal === "number" && Number.isFinite(d.originalSubTotal) ? d.originalSubTotal : null;
  if (purchasedSub != null) return purchasedSub;
  const qty = compactLineQuantity(d);
  const unitPurchased =
    typeof d.discountedPrice === "number" && Number.isFinite(d.discountedPrice) ? d.discountedPrice : d.originalPrice;
  return Number.isFinite(unitPurchased) ? unitPurchased * qty : 0;
}

export function OrderDetailLineList({ order, parentOrder = null, lines, ctx, formatMoneyVnd }: OrderDetailLineListProps) {
  return (
    <>
      {lines.map((d, idx) => {
        const qtyPurchased = compactLineQuantity(d);
        const purchasedAmount = (() => {
          if (ctx !== "refund_log") return lineAmountAsPurchased(d);
          const parentLine = findParentLineByDishId(parentOrder, d.dishId);
          const unitPurchased =
            typeof parentLine?.discountedPrice === "number" && Number.isFinite(parentLine.discountedPrice)
              ? parentLine.discountedPrice
              : typeof parentLine?.originalPrice === "number" && Number.isFinite(parentLine.originalPrice)
                ? parentLine.originalPrice
                : typeof d.discountedPrice === "number" && Number.isFinite(d.discountedPrice)
                  ? d.discountedPrice
                  : d.originalPrice;
          return Number.isFinite(unitPurchased) ? unitPurchased * qtyPurchased : 0;
        })();

        const strikeAmount = (() => {
          // Strike giá gốc trên món (nếu có giảm giá món) theo đúng số lượng lúc mua
          const parentLine = ctx === "refund_log" ? findParentLineByDishId(parentOrder, d.dishId) : null;
          const origUnit =
            typeof parentLine?.originalPrice === "number" && Number.isFinite(parentLine.originalPrice)
              ? parentLine.originalPrice
              : d.originalPrice;
          const origTotal = Number.isFinite(origUnit) ? origUnit * qtyPurchased : 0;
          return origTotal > 0 && origTotal > purchasedAmount ? origTotal : null;
        })();

        const refundAmount = Number.isFinite(d.subTotal) ? d.subTotal : 0;

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
                <p className="truncate text-sm font-semibold text-slate-900">
                  <span>{d.dishName}</span>
                  <span className="font-semibold text-slate-500"> ×{qtyPurchased}</span>
                </p>
                {ctx === "refund_log" && (
                  <p className="mt-1 text-sm font-extrabold leading-snug text-violet-800">
                    Giá lúc mua: {formatMoneyVnd(purchasedAmount)}
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {ctx === "refund_log" ? (
                <span className="text-sm font-extrabold text-slate-900">Hoàn {formatMoneyVnd(refundAmount)}</span>
              ) : strikeAmount != null ? (
                <div className="space-x-2">
                  <span className="text-xs font-semibold text-slate-400 line-through">
                    {formatMoneyVnd(strikeAmount)}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">{formatMoneyVnd(purchasedAmount)}</span>
                </div>
              ) : (
                <span className="text-sm font-extrabold text-slate-900">{formatMoneyVnd(purchasedAmount)}</span>
              )}
            </div>
          </li>
        );
      })}
    </>
  );
}

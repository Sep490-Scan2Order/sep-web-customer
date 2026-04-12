import type { CustomerOrderSummary } from "@/services/orderCustomerService";

export type CustomerOrderDetailLine = NonNullable<CustomerOrderSummary["orderDetails"]>[number];

/** Phiếu refund trong list — chỉ dựa vào cờ backend. */
export function isRefundLogEntry(o: CustomerOrderSummary): boolean {
  return o.isRefundLog === true;
}

export function resolveParentOrderFromList(
  orders: CustomerOrderSummary[],
  refundOrderId: string | null | undefined
): CustomerOrderSummary | null {
  if (!refundOrderId?.trim()) return null;
  const id = refundOrderId.trim().toLowerCase();
  const match = orders.find((x) => x.orderId.toLowerCase() === id);
  if (!match || isRefundLogEntry(match)) return null;
  return match;
}

export function orderDetailsSectionTitle(isRefundLog: boolean): string {
  return isRefundLog ? "Chi tiết hoàn" : "Món trong đơn";
}

/** Dòng đơn gốc có hoàn (một phần hoặc hết) — mới cần caption chi tiết Đặt / Đã hoàn / Còn. */
export function originalLineHasRefund(d: CustomerOrderDetailLine): boolean {
  const ref =
    typeof d.refundedQuantity === "number" && Number.isFinite(d.refundedQuantity) ? d.refundedQuantity : 0;
  if (ref > 0) return true;
  const q = typeof d.quantity === "number" && Number.isFinite(d.quantity) ? d.quantity : 0;
  const ord =
    typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity) ? d.orderedQuantity : 0;
  return q === 0 && ord > 0;
}

/** Dòng đơn gốc (partial refund): mô tả số lượng khi API có orderedQuantity. */
export function formatOriginalLineQuantityCaption(d: CustomerOrderDetailLine): string | null {
  if (typeof d.orderedQuantity !== "number" || !Number.isFinite(d.orderedQuantity)) return null;
  const ord = d.orderedQuantity;
  const ref =
    typeof d.refundedQuantity === "number" && Number.isFinite(d.refundedQuantity) ? d.refundedQuantity : 0;
  const left = typeof d.quantity === "number" && Number.isFinite(d.quantity) ? d.quantity : Math.max(0, ord - ref);
  return `Đặt ${ord} · Đã hoàn ${ref} · Còn ${left}`;
}

/**
 * Hiển thị tiền dòng đơn gốc: ưu tiên originalSubTotal vs subTotal (API mới);
 * fallback logic cũ theo originalPrice × quantity.
 */
export function lineAmountsForDisplay(
  d: CustomerOrderDetailLine,
  ctx: "original" | "refund_log"
): { struck: number | null; main: number } {
  const sub = Number(d.subTotal);
  const subOk = Number.isFinite(sub);

  if (ctx === "refund_log") {
    const main = subOk ? sub : 0;
    return { struck: null, main };
  }

  const origSub =
    typeof d.originalSubTotal === "number" && Number.isFinite(d.originalSubTotal) ? d.originalSubTotal : null;
  if (origSub != null && subOk && origSub !== sub) {
    return { struck: origSub, main: sub };
  }

  const orderedQty =
    typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity) ? d.orderedQuantity : null;
  const qRemain = typeof d.quantity === "number" && Number.isFinite(d.quantity) ? d.quantity : 0;
  /** API cũ: quantity = số đặt. API mới không có originalSubTotal: dùng orderedQuantity nếu có. */
  const qtyForUnitPriceLine = orderedQty != null && orderedQty > 0 ? orderedQty : qRemain;
  const originalLineTotal = d.originalPrice * qtyForUnitPriceLine;
  const discountedLineTotal = subOk ? sub : 0;

  if (
    Number.isFinite(discountedLineTotal) &&
    discountedLineTotal > 0 &&
    discountedLineTotal < originalLineTotal
  ) {
    return { struck: originalLineTotal, main: discountedLineTotal };
  }
  return {
    struck: null,
    main: Number.isFinite(discountedLineTotal) && discountedLineTotal > 0 ? discountedLineTotal : originalLineTotal,
  };
}

/** Còn / tổng trước hoàn ở header đơn gốc. */
export function shouldShowOriginalFinalStrike(o: CustomerOrderSummary): boolean {
  if (isRefundLogEntry(o)) return false;
  const orig = o.originalFinalAmount;
  if (typeof orig !== "number" || !Number.isFinite(orig)) return false;
  return orig !== o.finalAmount;
}

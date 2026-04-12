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
 * Hiển thị tiền dòng đơn gốc.
 * Struck price luôn là originalPrice × orderedQty (đơn giá niêm yết × số đặt) — giá gốc thực sự trước mọi KM.
 * Main price là subTotal hiện tại (sau KM món + sau scale hoàn nếu có).
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

  // Tính giá gốc thực sự (trước mọi giảm giá) = đơn giá niêm yết × số lượng đǫ7t
  const orderedQty =
    typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity) && d.orderedQuantity > 0
      ? d.orderedQuantity
      : typeof d.quantity === "number" && Number.isFinite(d.quantity) && d.quantity > 0
      ? d.quantity
      : 0;
  const trueOriginalTotal = orderedQty > 0 ? d.originalPrice * orderedQty : 0;

  // Main = subTotal hiện tại (có thể = 0 nếu hoàn hết)
  const main = subOk ? sub : 0;

  // Nếu giá gốc > main (đã có giảm giá hoặc đã hoàn): hiển thị struck
  if (Number.isFinite(trueOriginalTotal) && trueOriginalTotal > 0 && trueOriginalTotal > main) {
    return { struck: trueOriginalTotal, main };
  }

  return { struck: null, main: main > 0 ? main : trueOriginalTotal };
}

/** Còn / tổng trước hoàn ở header đơn gốc. */
export function shouldShowOriginalFinalStrike(o: CustomerOrderSummary): boolean {
  if (isRefundLogEntry(o)) return false;
  const orig = o.originalFinalAmount;
  if (typeof orig !== "number" || !Number.isFinite(orig)) return false;
  return orig !== o.finalAmount;
}

/**
 * Suy ra số tiền KM theo đơn từ dữ liệu hiện có:
 *   Σ originalSubTotal (tổng sau KM món, trước KM đơn) - originalFinalAmount (sau cả 2 loại KM)
 *
 * Chỉ tính được khi TẤT CẢ dòng đều có originalSubTotal từ backend.
 * Trả về 0 nếu không đủ dữ liệu hoặc không có KM đơn.
 *
 * Ưu tiên: dùng `o.promotionDiscount` nếu backend đã trả; fallback sang infer.
 */
export function inferOrderLevelDiscount(
  o: CustomerOrderSummary,
  lines: CustomerOrderDetailLine[]
): number {
  // Ưu tiên field backend gửi
  if (typeof o.promotionDiscount === "number" && Number.isFinite(o.promotionDiscount) && o.promotionDiscount > 0) {
    return o.promotionDiscount;
  }

  if (isRefundLogEntry(o)) return 0;
  const origFinal = o.originalFinalAmount;
  if (typeof origFinal !== "number" || !Number.isFinite(origFinal) || origFinal <= 0) return 0;
  if (lines.length === 0) return 0;

  // Kiểm tra tất cả dòng có originalSubTotal không
  const totals = lines.map((d) => {
    if (typeof d.originalSubTotal === "number" && Number.isFinite(d.originalSubTotal)) {
      return d.originalSubTotal;
    }
    return null;
  });
  if (totals.some((v) => v === null)) return 0; // thiếu data, bỏ qua

  const sumOrigSub = (totals as number[]).reduce((s, v) => s + v, 0);
  const diff = sumOrigSub - origFinal;
  // Làm tròn nghìn đồng, chỉ trả về nếu dương và hợp lý (< tổng đơn)
  const rounded = Math.round(diff / 1000) * 1000;
  return rounded > 0 && rounded < sumOrigSub ? rounded : 0;
}

/**
 * Phát hiện tỉ lệ thanh toán thực tế (paymentRatio) từ dòng trong phiếu refund.
 *
 * Logic backend (case 3 — KM theo đơn):
 *   subTotal (refund line) = originalPrice × qty × paymentRatio
 *
 * Nếu subTotal < originalPrice × qty → có KM theo đơn → trả về ratio.
 * Nếu subTotal ≈ originalPrice × qty (sai số < 0.1%) → coi là không có KM → trả về null.
 *
 * @returns ratio ∈ (0, 1) nếu có KM theo đơn; null nếu không.
 */
export function detectRefundLineOrderLevelRatio(d: CustomerOrderDetailLine): number | null {
  const sub = Number(d.subTotal);
  if (!Number.isFinite(sub) || sub <= 0) return null;

  const qty =
    typeof d.orderedQuantity === "number" && Number.isFinite(d.orderedQuantity) && d.orderedQuantity > 0
      ? d.orderedQuantity
      : typeof d.quantity === "number" && Number.isFinite(d.quantity) && d.quantity > 0
      ? d.quantity
      : 0;
  if (qty === 0) return null;

  const origPrice = Number(d.originalPrice);
  if (!Number.isFinite(origPrice) || origPrice <= 0) return null;

  const baseTotal = origPrice * qty;
  if (baseTotal <= 0) return null;

  const ratio = sub / baseTotal;
  // Nếu ratio >= 1 hoặc sai số < 0.01% → không có KM level đơn
  if (ratio >= 0.9999) return null;
  return ratio;
}

/**
 * Kiểm tra xem danh sách dòng refund có chứa KM theo đơn không
 * (ít nhất 1 dòng có tỉ lệ < 1).
 */
export function refundLinesHaveOrderLevelPromotion(lines: CustomerOrderDetailLine[]): boolean {
  return lines.some((d) => detectRefundLineOrderLevelRatio(d) !== null);
}

/**
 * Tính paymentRatio trung bình từ các dòng có KM theo đơn.
 * Dùng cho display tổng quan ở header phiếu hoàn.
 */
export function estimatePaymentRatioFromRefundLines(lines: CustomerOrderDetailLine[]): number | null {
  const ratios = lines.map(detectRefundLineOrderLevelRatio).filter((r): r is number => r !== null);
  if (ratios.length === 0) return null;
  const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  return avg;
}

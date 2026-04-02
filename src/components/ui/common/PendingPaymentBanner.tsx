"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, QrCode, X } from "lucide-react";
import {
  loadPendingBankTransfer,
  clearPendingBankTransfer,
  PENDING_BANK_TRANSFER_TTL_MS,
  PENDING_BANK_TRANSFER_SAFE_TTL_MS,
  type PendingBankTransferSession,
} from "@/services/orderCustomerService";

interface PendingPaymentBannerProps {
  /** Lọc theo restaurantId — match if provided */
  restaurantId?: number | string;
  /** Lọc theo restaurantSlug — match if provided (fallback khi restaurantId không có) */
  restaurantSlug?: string;
}

/** Còn bao nhiêu ms tính từ savedAt theo safe TTL (13 phút) */
function useSafeRemaining(savedAt: number) {
  const calc = () => Math.max(0, PENDING_BANK_TRANSFER_SAFE_TTL_MS - (Date.now() - savedAt));
  const [remaining, setRemaining] = useState(calc);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(calc()), 1000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAt]);

  return remaining;
}

function formatCountdown(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // cảnh báo trong 2 phút cuối

function matchesPending(
  pending: PendingBankTransferSession,
  restaurantId?: number | string,
  restaurantSlug?: string,
): boolean {
  // Nếu cả 2 đều không truyền vào → luôn hiển thị
  if (!restaurantId && !restaurantSlug) return true;
  // Kiểm tra restaurantId trước
  if (restaurantId && String(pending.restaurantId) === String(restaurantId)) return true;
  // Fallback kiểm tra slug
  if (restaurantSlug && pending.restaurantSlug === restaurantSlug) return true;
  return false;
}

export function PendingPaymentBanner({ restaurantId, restaurantSlug }: PendingPaymentBannerProps) {
  const router = useRouter();
  const [session, setSession] = useState<PendingBankTransferSession | null>(null);

  useEffect(() => {
    const pending = loadPendingBankTransfer();
    if (!pending) return;

    if (!matchesPending(pending, restaurantId, restaurantSlug)) return;

    // Kiểm tra còn nằm trong safe window (13 phút) không
    const elapsed = Date.now() - pending.savedAt;
    if (elapsed >= PENDING_BANK_TRANSFER_SAFE_TTL_MS) {
      clearPendingBankTransfer();
      return;
    }
    setSession(pending);
  }, [restaurantId, restaurantSlug]);

  const safeRemaining = useSafeRemaining(session?.savedAt ?? Date.now());

  const handleDismiss = useCallback(() => {
    clearPendingBankTransfer();
    setSession(null);
  }, []);

  const handleResume = useCallback(() => {
    if (!session) return;
    router.push(session.checkoutUrl);
  }, [session, router]);

  // Khi hết safe window, ẩn banner
  useEffect(() => {
    if (safeRemaining === 0 && session) {
      clearPendingBankTransfer();
      setSession(null);
    }
  }, [safeRemaining, session]);

  // Re-check khi tab focus lại (user để tab nền lâu)
  useEffect(() => {
    function onFocus() {
      const pending = loadPendingBankTransfer();
      if (!pending) { setSession(null); return; }
      const elapsed = Date.now() - pending.savedAt;
      if (elapsed >= PENDING_BANK_TRANSFER_SAFE_TTL_MS) {
        clearPendingBankTransfer();
        setSession(null);
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!session || safeRemaining === 0) return null;

  const isWarning = safeRemaining <= WARNING_THRESHOLD_MS;
  const formattedTotal = session.totalAmount.toLocaleString("vi-VN") + "đ";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="mx-auto max-w-lg pointer-events-auto">
        <div
          className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl text-white transition-colors ${
            isWarning
              ? "border-orange-300 bg-orange-500"
              : "border-blue-200 bg-blue-600"
          }`}
        >
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            {isWarning ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <QrCode className="h-5 w-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold leading-tight truncate">
              {isWarning
                ? "⚠ Sắp hết hạn! Quét QR ngay!"
                : `Đơn chưa thanh toán · ${formattedTotal}`}
            </p>
            <p className={`text-xs mt-0.5 ${isWarning ? "text-orange-100" : "text-blue-100"}`}>
              {session.restaurantName} · Còn{" "}
              <span className={`font-bold ${isWarning ? "text-white animate-pulse" : "text-white"}`}>
                {formatCountdown(safeRemaining)}
              </span>{" "}
              {isWarning ? "— sau đó đơn bị huỷ" : "để quét QR"}
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleResume}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold shadow-sm active:scale-95 ${
              isWarning
                ? "bg-white text-orange-600 hover:bg-orange-50"
                : "bg-white text-blue-700 hover:bg-blue-50"
            }`}
          >
            Quét QR
          </button>

          {/* Dismiss — chỉ hiện khi còn nhiều thời gian */}
          {!isWarning && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Đóng"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  orderCode?: number;
}

export function QrCodeModal({ open, onClose, qrCodeUrl, orderCode }: QrCodeModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = orderCode != null ? `Mã QR đơn #${orderCode}` : "Mã QR đơn hàng";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <img
            src={qrCodeUrl}
            alt={title}
            className="mx-auto aspect-square w-full max-w-[320px] rounded-lg border border-slate-200 bg-white object-contain"
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Đưa mã này cho nhân viên để kiểm tra trạng thái đơn.
        </p>
      </div>
    </div>
  );
}

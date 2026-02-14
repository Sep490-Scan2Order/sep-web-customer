"use client";

import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";

export function VoucherPage() {
  // Mock điểm voucher - sau tích hợp API
  const voucherPoints = 1250;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-[#F6F3EC] px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-left">
          Điểm voucher
        </h1>

        <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-emerald-900/10 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Gift className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Số dư điểm
            </h2>
          </div>

          <div className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 p-6 text-center">
            <p className="mb-1 text-sm font-medium text-emerald-700">
              Số điểm hiện có
            </p>
            <p className="text-3xl font-bold tabular-nums text-emerald-800 sm:text-4xl">
              {voucherPoints.toLocaleString("vi-VN")}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Đổi điểm lấy voucher giảm giá tại các nhà hàng đối tác
            </p>
          </div>

          <Link
            href="#"
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-500 bg-transparent px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Đổi điểm / Xem voucher
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

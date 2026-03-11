"use client";

import { useState } from "react";
import { MainLayout } from "@/components/ui/common";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export default function AboutUsPage() {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  return (
    <MainLayout>
      <main className="flex justify-center bg-slate-50 px-4 py-6 sm:py-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <header className="rounded-2xl bg-emerald-50 px-4 py-3 sm:px-5 sm:py-4">
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Về Scan2Order
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Thông tin giới thiệu về nền tảng Scan2Order cho nhà hàng và khách hàng.
            </p>
          </header>

          {/* Company / product info */}
          <section className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Scan2Order Platform
            </h2>
            <p className="mt-2 leading-relaxed">
              Scan2Order là nền tảng giúp nhà hàng số hóa quy trình phục vụ: khách
              quét mã QR tại quán để xem menu, chọn món và gửi yêu cầu trực tiếp
              đến hệ thống của nhà hàng.
            </p>
            <p className="mt-2 leading-relaxed">
              Mục tiêu của chúng tôi là giúp việc gọi món trở nên nhanh chóng,
              hạn chế nhầm lẫn, đồng thời giúp nhà hàng quản lý đơn hàng, món ăn
              và trạng thái phục vụ một cách rõ ràng hơn.
            </p>
            <p className="mt-2 leading-relaxed">
              Nền tảng được phát triển và vận hành bởi đội ngũ Scan2Order tại
              Việt Nam, hướng tới việc hỗ trợ nhiều quy mô nhà hàng khác nhau,
              từ quán nhỏ đến chuỗi thương hiệu.
            </p>
          </section>

          {/* Policies / links (placeholder) */}
          <section className="rounded-2xl bg-white p-4 text-sm shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Chính sách &amp; điều khoản
            </h2>
            <ul className="mt-3 space-y-1">
              <li>
                <a
                  href="/privacy-policy"
                  className="text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  className="text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Điều khoản sử dụng
                </a>
              </li>
              <li>
                <a
                  href="/partnership"
                  className="text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Hợp tác &amp; đối tác
                </a>
              </li>
            </ul>
          </section>

          {/* Feedback */}
          <section className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm sm:p-5">
            <p>Bạn thấy thông tin này có hữu ích không?</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setFeedback("yes")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium sm:text-sm transition ${
                  feedback === "yes"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                Có
              </button>
              <button
                type="button"
                onClick={() => setFeedback("no")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium sm:text-sm transition ${
                  feedback === "no"
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                Không
              </button>
            </div>
            {feedback && (
              <p className="mt-3 text-xs text-slate-500">
                Cảm ơn bạn đã phản hồi.
              </p>
            )}
          </section>

        </div>
      </main>
    </MainLayout>
  );
}

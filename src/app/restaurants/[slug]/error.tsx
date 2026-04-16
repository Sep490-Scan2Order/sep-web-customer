"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RestaurantDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[RestaurantDetailError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 px-4">
      {/* Animated sad face */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute h-40 w-40 animate-ping rounded-full bg-orange-100 opacity-30" />
        <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-orange-100">
          <svg
            viewBox="0 0 100 100"
            className="h-20 w-20"
            aria-hidden="true"
          >
            {/* Face circle */}
            <circle cx="50" cy="50" r="48" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
            {/* Left eye */}
            <ellipse cx="35" cy="38" rx="5" ry="6" fill="#374151" />
            {/* Right eye */}
            <ellipse cx="65" cy="38" rx="5" ry="6" fill="#374151" />
            {/* Tears */}
            <ellipse cx="35" cy="47" rx="3" ry="4" fill="#93C5FD" opacity="0.8" />
            <ellipse cx="65" cy="47" rx="3" ry="4" fill="#93C5FD" opacity="0.8" />
            {/* Sad mouth */}
            <path
              d="M 30 70 Q 50 58 70 70"
              fill="none"
              stroke="#374151"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Text content */}
      <div className="max-w-sm text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-orange-500">
          Nhà hàng không khả dụng
        </p>
        <h1 className="mb-4 text-3xl font-bold text-slate-800">
          Oops! Không thể truy cập
        </h1>
        <p className="mb-8 leading-relaxed text-slate-500">
          Nhà hàng này hiện không còn hoạt động hoặc đang tạm ngưng dịch vụ.
          Vui lòng thử lại sau hoặc khám phá các nhà hàng khác.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/restaurants"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-orange-500 hover:to-amber-500 hover:shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M2.879 7.121A3 3 0 007.5 6.196a3.001 3.001 0 002.634 1.55 3 3 0 002.571-1.446A3 3 0 0017.5 7.5a3 3 0 00.919-.141v6.891a2 2 0 01-2 2H3.581a2 2 0 01-2-2V7.359c.295.094.605.141.919.141a3 3 0 00.379-.021z" />
            </svg>
            Tìm nhà hàng khác
          </Link>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
            Thử lại
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-slate-400">Powered by scan2order.io.vn</p>
    </div>
  );
}

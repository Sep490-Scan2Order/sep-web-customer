"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * Route cũ — chuyển về tra cứu thống nhất (/orders/lookup) giữ nguyên query.
 */
function HistoryRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `/orders/lookup?${q}` : "/orders/lookup");
  }, [router, searchParams]);

  return (
    <div className="min-h-[100dvh] bg-white px-3 py-6 sm:bg-[#ECECEC] sm:px-4 sm:py-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Đang chuyển trang…</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-white px-3 py-6 sm:bg-[#ECECEC] sm:px-4 sm:py-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Đang tải…</p>
          </div>
        </div>
      }
    >
      <HistoryRedirectInner />
    </Suspense>
  );
}

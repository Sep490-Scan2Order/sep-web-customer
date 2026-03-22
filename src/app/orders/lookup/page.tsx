import OrderLookupView from "@/views/OrderLookup";
import { Suspense } from "react";

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
      <OrderLookupView />
    </Suspense>
  );
}


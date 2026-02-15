"use client";

import { useState } from "react";
import { Gift, CheckCircle } from "lucide-react";

/** Voucher tiền – hiệu lực hoặc đã sử dụng. minOrderAmount: đơn tối thiểu (VNĐ) */
type MoneyVoucher = {
  id: string;
  value: string;
  minOrderAmount: number;
  color: string;
  usedAt?: string;
};

const MY_ACTIVE: MoneyVoucher[] = [
  { id: "m1", value: "10K", minOrderAmount: 100000, color: "bg-amber-500" },
  { id: "m2", value: "20K", minOrderAmount: 150000, color: "bg-emerald-600" },
];

const MY_USED: MoneyVoucher[] = [
  { id: "u1", value: "5K", minOrderAmount: 50000, color: "bg-slate-400", usedAt: "05/06" },
];

function MyVoucherCard({ v, variant }: { v: MoneyVoucher; variant: "active" | "used" }) {
  const isUsed = variant === "used";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg ${
        isUsed ? "opacity-80" : ""
      }`}
    >
      <div className={`relative flex min-h-[90px] items-center justify-center overflow-hidden ${v.color}`}>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px",
          }}
          aria-hidden
        />
        <span className="relative text-2xl font-bold text-white drop-shadow-md sm:text-3xl">
          {v.value}
        </span>
      </div>
      <div className="flex flex-col rounded-b-2xl bg-white p-4">
        <p className="text-xs text-slate-400">Scan2Order</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          PHIẾU GIẢM GIÁ {v.value} ĐỔI TỪ ĐIỂM TÍCH LŨY
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Đơn tối thiểu: {v.minOrderAmount.toLocaleString("vi-VN")}đ
        </p>
        {isUsed && v.usedAt ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle className="h-4 w-4" />
            Đã sử dụng {v.usedAt}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function MyVouchersPage() {
  const [tab, setTab] = useState<"active" | "used">("active");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F3EC] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 flex items-center gap-2 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-left">
          <Gift className="h-7 w-7 text-emerald-600" />
          Voucher của tôi
        </h1>

        <div className="mb-6 flex gap-2 rounded-xl bg-white/80 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === "active"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Hiệu lực
          </button>
          <button
            type="button"
            onClick={() => setTab("used")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === "used"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Đã sử dụng
          </button>
        </div>

        {tab === "active" && (
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {MY_ACTIVE.length === 0 ? (
              <div className="col-span-2 rounded-2xl bg-white/80 py-10 text-center text-slate-500">
                Chưa có voucher hiệu lực. Hãy đổi phiếu giảm giá tại mục Điểm voucher.
              </div>
            ) : (
              MY_ACTIVE.map((v) => (
                <MyVoucherCard key={v.id} v={v} variant="active" />
              ))
            )}
          </div>
        )}

        {tab === "used" && (
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {MY_USED.length === 0 ? (
              <div className="col-span-2 rounded-2xl bg-white/80 py-10 text-center text-slate-500">
                Chưa có voucher nào đã sử dụng.
              </div>
            ) : (
              MY_USED.map((v) => (
                <MyVoucherCard key={v.id} v={v} variant="used" />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

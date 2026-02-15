"use client";

import Link from "next/link";
import { Gift, Ticket } from "lucide-react";
import { ROUTES } from "@/routes";

const MOCK_POINTS = 1250;

/** Chỉ voucher tiền – đổi từ điểm. minOrderAmount: đơn tối thiểu (VNĐ) để dùng voucher */
type MoneyVoucher = {
  id: string;
  value: string;
  pointsCost: number;
  minOrderAmount: number;
  color: string;
};

const SYSTEM_VOUCHERS: MoneyVoucher[] = [
  { id: "1", value: "5K", pointsCost: 1000, minOrderAmount: 50000, color: "bg-teal-500" },
  { id: "2", value: "10K", pointsCost: 2000, minOrderAmount: 100000, color: "bg-amber-500" },
  { id: "3", value: "20K", pointsCost: 4000, minOrderAmount: 150000, color: "bg-yellow-400" },
  { id: "4", value: "50K", pointsCost: 10000, minOrderAmount: 300000, color: "bg-blue-600" },
  { id: "5", value: "100K", pointsCost: 20000, minOrderAmount: 500000, color: "bg-violet-600" },
  { id: "6", value: "200K", pointsCost: 40000, minOrderAmount: 800000, color: "bg-emerald-600" },
  { id: "7", value: "500K", pointsCost: 80000, minOrderAmount: 1500000, color: "bg-rose-500" },
];

function MoneyVoucherCard({ v }: { v: MoneyVoucher }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg">
      {/* Phần trên: mệnh giá trên nền màu có họa tiết chấm */}
      <div className={`relative flex min-h-[100px] items-center justify-center overflow-hidden ${v.color}`}>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px",
          }}
          aria-hidden
        />
        <span className="relative text-3xl font-bold text-white drop-shadow-md sm:text-4xl">
          {v.value}
        </span>
      </div>
      {/* Phần dưới: thương hiệu, mô tả, nút đổi */}
      <div className="flex flex-col rounded-b-2xl bg-white p-4">
        <p className="text-xs text-slate-400">Scan2Order</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          PHIẾU GIẢM GIÁ {v.value} ĐỔI TỪ ĐIỂM TÍCH LŨY
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Đơn tối thiểu: {v.minOrderAmount.toLocaleString("vi-VN")}đ
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          {v.pointsCost.toLocaleString("vi-VN")} Điểm · Đổi
        </button>
      </div>
    </article>
  );
}

export function VoucherPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F6F3EC] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-left">
          Voucher
        </h1>

        {/* Điểm của tôi */}
        <section className="mb-8 rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-lg shadow-emerald-900/5 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Điểm · Scan2Order</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
                  {MOCK_POINTS.toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-slate-500 sm:text-left">
              Dùng điểm đổi phiếu giảm giá bên dưới.{" "}
              <Link href={ROUTES.MY_VOUCHERS} className="font-medium text-emerald-600 hover:underline">
                Xem voucher của tôi
              </Link>
            </p>
          </div>
        </section>

        {/* Đổi voucher tiền của hệ thống */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Ticket className="h-5 w-5 text-emerald-600" />
            Đổi voucher của hệ thống
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Phiếu giảm giá theo mệnh giá (VNĐ). Chọn mệnh giá và bấm Đổi.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {SYSTEM_VOUCHERS.map((v) => (
              <MoneyVoucherCard key={v.id} v={v} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

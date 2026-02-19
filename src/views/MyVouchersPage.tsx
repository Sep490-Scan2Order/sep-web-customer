"use client";

import { useState, useEffect } from "react";
import { Gift, CheckCircle } from "lucide-react";
import { getMyVouchers, getMyExpiredVouchers, type MemberVoucherDto } from "@/services/voucherService";

type MoneyVoucher = {
  id: string;
  value: string;
  minOrderAmount: number;
  color: string;
  usedAt?: string;
};

const COLORS = ["bg-amber-500", "bg-emerald-600", "bg-blue-500", "bg-purple-500", "bg-pink-500"];

function formatDiscountValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return `${value.toFixed(0)}K`;
}

function formatDate(dateString: string | null): string | undefined {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return undefined;
  }
}

function mapVoucherToMoneyVoucher(v: MemberVoucherDto, index: number): MoneyVoucher {
  return {
    id: `v${v.memberVoucherId}`,
    value: formatDiscountValue(v.discountValue),
    minOrderAmount: v.minOrderAmount,
    color: COLORS[index % COLORS.length],
    usedAt: formatDate(v.expiredAt),
  };
}

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
  const [activeVouchers, setActiveVouchers] = useState<MoneyVoucher[]>([]);
  const [expiredVouchers, setExpiredVouchers] = useState<MoneyVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "active") {
          const data = await getMyVouchers();
          setActiveVouchers(data.map(mapVoucherToMoneyVoucher));
        } else {
          const data = await getMyExpiredVouchers();
          setExpiredVouchers(data.map(mapVoucherToMoneyVoucher));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải voucher");
        console.error("Error fetching vouchers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, [tab]);

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
            {loading ? (
              <div className="col-span-2 rounded-2xl bg-white/80 py-10 text-center text-slate-500">
                Đang tải...
              </div>
            ) : error ? (
              <div className="col-span-2 rounded-2xl bg-red-50 py-10 text-center text-red-600">
                {error}
              </div>
            ) : activeVouchers.length === 0 ? (
              <div className="col-span-2 rounded-2xl bg-white/80 py-10 text-center text-slate-500">
                Chưa có voucher hiệu lực. Hãy đổi phiếu giảm giá tại mục Điểm voucher.
              </div>
            ) : (
              activeVouchers.map((v) => (
                <MyVoucherCard key={v.id} v={v} variant="active" />
              ))
            )}
          </div>
        )}

        {tab === "used" && (
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {loading ? (
              <div className="col-span-2 rounded-2xl bg-white/80 py-10 text-center text-slate-500">
                Đang tải...
              </div>
            ) : error ? (
              <div className="col-span-2 rounded-2xl bg-red-50 py-10 text-center text-red-600">
                {error}
              </div>
            ) : expiredVouchers.length === 0 ? (
              <div className="col-span-2 rounded-2xl bg-white/80 py-10 text-center text-slate-500">
                Chưa có voucher nào đã sử dụng.
              </div>
            ) : (
              expiredVouchers.map((v) => (
                <MyVoucherCard key={v.id} v={v} variant="used" />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

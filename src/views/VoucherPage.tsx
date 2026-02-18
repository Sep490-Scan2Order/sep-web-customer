"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, Ticket } from "lucide-react";
import { ROUTES } from "@/routes";
import { getAllVouchers, getMyPoint, type VoucherResponseDto } from "@/services";

type VoucherWithColor = VoucherResponseDto & { color: string };

function formatDiscountValue(value: number): string {
  if (value % 1000 === 0) {
    return `${value / 1000}K`;
  }
  return `${value.toLocaleString("vi-VN")}đ`;
}

function MoneyVoucherCard({ v }: { v: VoucherWithColor }) {
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
          {formatDiscountValue(v.discountValue)}
        </span>
      </div>
      {/* Phần dưới: thương hiệu, mô tả, nút đổi */}
      <div className="flex flex-col rounded-b-2xl bg-white p-4">
        <p className="text-xs text-slate-400">Scan2Order</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {v.name}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Đơn tối thiểu: {v.minOrderAmount.toLocaleString("vi-VN")}đ
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          {v.pointRequire.toLocaleString("vi-VN")} Điểm · Đổi
        </button>
      </div>
    </article>
  );
}

export function VoucherPage() {
  const [vouchers, setVouchers] = useState<VoucherWithColor[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [apiVouchers, myPoint] = await Promise.all([
          getAllVouchers(),
          getMyPoint().catch((err: any) => {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
              router.push(ROUTES.LOGIN);
              throw err;
            }
            return 0;
          }),
        ]);

        if (cancelled) return;

        setPoints(myPoint);

        const colors = [
          "bg-teal-500",
          "bg-amber-500",
          "bg-yellow-400",
          "bg-blue-600",
          "bg-violet-600",
          "bg-emerald-600",
          "bg-rose-500",
        ];

        const withColors: VoucherWithColor[] = apiVouchers.map((v, index) => ({
          ...v,
          color: colors[index % colors.length],
        }));

        setVouchers(withColors);
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          router.push(ROUTES.LOGIN);
          return;
        }
        setError("Không tải được danh sách voucher. Vui lòng thử lại sau.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
                  {points !== null ? points.toLocaleString("vi-VN") : "—"}
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
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-40 animate-pulse rounded-2xl bg-slate-200/70"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="rounded-2xl bg-white/80 p-6 text-center text-sm text-slate-500">
              Hiện chưa có voucher nào trong hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {vouchers.map((v) => (
                <MoneyVoucherCard key={v.id} v={v} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

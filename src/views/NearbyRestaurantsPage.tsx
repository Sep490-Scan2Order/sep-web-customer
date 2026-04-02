import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { NearbyRestaurantGrid } from "@/components/ui/common";
import { ROUTES } from "@/constants/routes";

export function NearbyRestaurantsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={ROUTES.HOME}
        className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Trang chủ
      </Link>

      <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <MapPin className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Nhà hàng xung quanh bạn</h1>
        <p className="mt-2 text-sm text-slate-600">
          Danh sách được gợi ý dựa trên vị trí hiện tại để bạn chọn nhanh nhà hàng gần nhất.
        </p>
      </div>

      <NearbyRestaurantGrid />
    </div>
  );
}

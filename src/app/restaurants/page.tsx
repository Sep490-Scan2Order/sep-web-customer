"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MainLayout, AllRestaurantsList } from "@/components/ui/common";
import { ROUTES } from "@/constants/routes";

export default function RestaurantsPage() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword");

  const pageTitle = keyword ? `Kết quả tìm kiếm: "${keyword}"` : "Tất cả nhà hàng";

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.HOME}
          className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          {pageTitle}
        </h1>
        <AllRestaurantsList keyword={keyword} />
      </div>
    </MainLayout>
  );
}

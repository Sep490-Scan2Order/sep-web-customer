import Link from "next/link";
import { MainLayout } from "@/layouts";
import { AllRestaurantsList } from "@/components/AllRestaurantsList";
import { ROUTES } from "@/routes";
import { ArrowLeft } from "lucide-react";

export default function RestaurantsPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.HOME}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          Tất cả nhà hàng
        </h1>
        <AllRestaurantsList />
      </div>
    </MainLayout>
  );
}

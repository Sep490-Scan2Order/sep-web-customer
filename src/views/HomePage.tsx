import Link from "next/link";
import { HeroSection } from "@/components/HeroSection";
import { NearbyRestaurantGrid } from "@/components/NearbyRestaurantGrid";
import { ROUTES } from "@/routes";
import { ChevronRight } from "lucide-react";

export function HomePage() {
  return (
    <>
      <HeroSection />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">
            Nhà hàng gần đây
          </h2>
          <Link
            href={ROUTES.RESTAURANTS}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Tất cả nhà hàng
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <NearbyRestaurantGrid />
      </section>
    </>
  );
}

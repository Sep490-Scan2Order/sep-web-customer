"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  History,
  MapPin,
  QrCode,
  Sparkles,
} from "lucide-react";
import {
  AllRestaurantsOrderLookupDrawer,
  HeroSection,
  NearbyRestaurantGrid,
} from "@/components/ui/common";
import { ROUTES } from "@/constants/routes";

const quickActions = [
  {
    title: "Khám phá nhà hàng quanh bạn",
    description: "Duyệt danh sách nhà hàng theo khu vực và chọn nơi phù hợp nhanh hơn.",
    href: ROUTES.NEARBY_RESTAURANTS,
    icon: MapPin,
    cta: "Xem quanh bạn",
  },
  {
    title: "Tra cứu hóa đơn",
    description: "Kiểm tra trạng thái món ăn theo thời gian thực trong lịch sử đơn.",
    href: ROUTES.HOME,
    icon: History,
    cta: "Tra cứu hóa đơn",
    openLookup: true,
  },
  {
    title: "Quét QR tại bàn",
    description: "Quét mã để vào menu đúng nhà hàng, đúng chi nhánh và đặt món ngay.",
    href: ROUTES.RESTAURANTS,
    icon: QrCode,
    cta: "Bắt đầu đặt món",
  },
] as const;

const usageSteps = [
  "Chọn nhà hàng hoặc quét mã QR tại bàn.",
  "Thêm món yêu thích vào giỏ và xác nhận đơn.",
  "Theo dõi trạng thái chế biến cho tới khi nhận món.",
] as const;

const recommendedHours = [
  { slot: "10:30 - 11:30", note: "Đặt sớm để tránh giờ trưa cao điểm" },
  { slot: "14:00 - 17:00", note: "Khung giờ vắng, món ra nhanh hơn" },
  { slot: "18:00 - 19:00", note: "Nên đặt trước nếu đi theo nhóm" },
] as const;

export function HomePage() {
  const [orderLookupOpen, setOrderLookupOpen] = useState(false);

  return (
    <>
      <HeroSection />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-900">Gợi ý dành cho bạn</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <article
                key={action.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{action.title}</h3>
                <p className="mb-5 text-sm leading-6 text-slate-600">{action.description}</p>
                {"openLookup" in action && action.openLookup ? (
                  <button
                    type="button"
                    onClick={() => setOrderLookupOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    {action.cta}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    href={action.href}
                    className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    {action.cta}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6">
            <h3 className="mb-4 text-xl font-bold text-emerald-900">Đặt món trong 3 bước</h3>
            <div className="space-y-3">
              {usageSteps.map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-6 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-sky-600" />
              <h3 className="text-xl font-bold text-slate-900">Khung giờ gợi ý</h3>
            </div>
            <div className="space-y-3">
              {recommendedHours.map((item) => (
                <div
                  key={item.slot}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-900">{item.slot}</p>
                  <p className="text-sm text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">
            Nhà hàng gần đây
          </h2>
          <Link
            href={ROUTES.RESTAURANTS}
            className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Tất cả nhà hàng
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <NearbyRestaurantGrid />
      </section>

      <AllRestaurantsOrderLookupDrawer
        open={orderLookupOpen}
        onClose={() => setOrderLookupOpen(false)}
      />
    </>
  );
}

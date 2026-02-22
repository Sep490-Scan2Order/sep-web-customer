"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Info, X } from "lucide-react";
import { MainLayout } from "@/layouts";
import type { RestaurantDetailDto } from "@/services/restaurantService";
import { ROUTES } from "@/routes";
import { FALLBACK_RESTAURANT_IMAGE } from "@/lib/constants";

interface RestaurantDetailViewProps {
  restaurant: RestaurantDetailDto;
}

const MENU_CATEGORIES = [
  "Món Bán Chạy",
  "Combo",
  "Đồ uống",
  "Khai vị",
  "Món chính",
];

function buildDirectionsUrl(r: RestaurantDetailDto): string {
  const lat = r.latitude;
  const lng = r.longitude;
  if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    const dest = `${lat},${lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  }
  if (r.address?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address.trim())}`;
  }
  return "https://www.google.com/maps";
}

export default function RestaurantDetailView({
  restaurant: r,
}: RestaurantDetailViewProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [coverSrc, setCoverSrc] = useState(r.image || FALLBACK_RESTAURANT_IMAGE);

  useEffect(() => {
    setCoverSrc(r.image || FALLBACK_RESTAURANT_IMAGE);
  }, [r.image]);

  const distanceText =
    r.distanceKm != null ? `~ ${r.distanceKm.toFixed(1)} km` : "";
  const isOpened = r.isOpened;
  const statusLabel = isOpened ? "Đang mở cửa" : "Đã đóng cửa";
  const statusDot = isOpened ? "🟢" : "🔴";

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Header: Cover + Back */}
        <header className="relative aspect-[4/3] max-h-[320px] w-full overflow-hidden bg-slate-200">
          <img
            src={coverSrc}
            alt={r.restaurantName}
            className="h-full w-full object-cover"
            onError={() => setCoverSrc(FALLBACK_RESTAURANT_IMAGE)}
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute left-0 right-0 top-0 p-4">
            <Link
              href={ROUTES.HOME}
              className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Trở về
            </Link>
          </div>
        </header>

        {/* Name, category, distance, status */}
        <section className="border-b border-slate-200 bg-white px-4 pb-4 pt-5">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {r.restaurantName}
          </h1>
          {r.description && (
            <p className="mt-1 text-slate-600">{r.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {distanceText && (
              <span className="text-slate-500">{distanceText}</span>
            )}
            <span className="font-medium text-slate-700">
              {statusDot} {statusLabel}
            </span>
          </div>
        </section>

        {/* Action buttons */}
        <section className="flex gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <a
            href={buildDirectionsUrl(r)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <MapPin className="h-4 w-4" />
            Chỉ đường
          </a>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Info className="h-4 w-4" />
            Thông tin quán
          </button>
        </section>

        {/* Info popup */}
        {infoOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Thông tin quán"
          >
            <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Thông tin quán
                </h2>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <dl className="space-y-3 text-sm">
                {r.address && (
                  <div>
                    <dt className="font-medium text-slate-500">Địa chỉ</dt>
                    <dd className="mt-0.5 text-slate-800">{r.address}</dd>
                  </div>
                )}
                {r.phone && (
                  <div>
                    <dt className="font-medium text-slate-500">Điện thoại</dt>
                    <dd className="mt-0.5">
                      <a
                        href={`tel:${r.phone}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {r.phone}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-slate-500">Trạng thái</dt>
                  <dd className="mt-0.5 text-slate-800">
                    {statusDot} {statusLabel}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-400">
                Giờ mở/đóng cửa sẽ cập nhật khi có từ nhà hàng.
              </p>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Menu: category tabs + placeholder content */}
        <section className="px-4 py-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Thực đơn
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {MENU_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            Danh sách món theo danh mục sẽ hiển thị tại đây khi có dữ liệu từ API.
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

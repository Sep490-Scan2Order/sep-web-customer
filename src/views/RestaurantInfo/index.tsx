"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Clock, Star, Navigation, Calendar, Users } from "lucide-react";
import { MainLayout } from "@/layouts";
import type { RestaurantSlugResponseData } from "@/types";
import { FALLBACK_RESTAURANT_IMAGE } from "@/lib/constants";
import { ROUTES } from "@/routes";

interface RestaurantInfoViewProps {
  restaurant: RestaurantSlugResponseData;
}

function buildDirectionsUrl(r: RestaurantSlugResponseData): string {
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

export default function RestaurantInfoView({ restaurant: r }: RestaurantInfoViewProps) {
  const [coverSrc, setCoverSrc] = useState(r.image || FALLBACK_RESTAURANT_IMAGE);

  useEffect(() => {
    setCoverSrc(r.image || FALLBACK_RESTAURANT_IMAGE);
  }, [r.image]);

  const isOpened = r.isOpened;
  const statusLabel = isOpened ? "Đang mở cửa" : "Đã đóng cửa";
  const statusDot = isOpened ? "🟢" : "🔴";
  const distanceText = r.distanceKm != null ? `~ ${r.distanceKm.toFixed(1)} km` : null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-8">
        {/* Hero Image Section */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-200 sm:h-56 lg:h-64">
          <img
            src={coverSrc}
            alt={r.restaurantName}
            className="h-full w-full object-cover"
            onError={() => setCoverSrc(FALLBACK_RESTAURANT_IMAGE)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Back Button */}
          <Link
            href={ROUTES.HOME}
            className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur-sm transition hover:bg-white"
          >
            ← Quay lại
          </Link>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Restaurant Header */}
          <div className="mt-4 rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  {r.restaurantName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    {statusDot} {statusLabel}
                  </span>
                  {distanceText && (
                    <span className="text-slate-500">{distanceText}</span>
                  )}
                </div>
              </div>

              {/* View Menu Button */}
              {r.slug && (
                <Link
                  href={ROUTES.RESTAURANT_SLUG(r.slug)}
                  className="shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-95"
                >
                  Xem Menu
                </Link>
              )}
            </div>

            {/* Description */}
            {r.description && (
              <div className="mt-4 rounded-lg bg-amber-50 p-4">
                <p className="text-sm leading-relaxed text-slate-700">{r.description}</p>
              </div>
            )}
          </div>

          {/* Information Cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Address Card */}
            {r.address && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Địa chỉ</h3>
                    <p className="mt-1 text-sm text-slate-600">{r.address}</p>
                    <a
                      href={buildDirectionsUrl(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Navigation className="h-4 w-4" />
                      Chỉ đường
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Card */}
            {r.phone && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Điện thoại</h3>
                    <a
                      href={`tel:${r.phone}`}
                      className="mt-1 block text-sm font-medium text-green-600 hover:text-green-700"
                    >
                      {r.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Status Card */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Trạng thái</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {isOpened ? "Đang hoạt động" : "Tạm đóng cửa"}
                  </p>
                  {r.isReceivingOrders && (
                    <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Đang nhận đơn
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-2">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Thống kê</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Tổng đơn hàng: <span className="font-medium">{r.totalOrder || 0}</span>
                  </p>
                  {r.createdAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      Tham gia từ {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-900">Hành động</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {r.slug && (
                <Link
                  href={ROUTES.RESTAURANT_SLUG(r.slug)}
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-orange-500 bg-orange-50 px-4 py-3 font-semibold text-orange-600 transition hover:bg-orange-100"
                >
                  <Star className="h-5 w-5" />
                  Xem Menu & Đặt món
                </Link>
              )}
              <a
                href={buildDirectionsUrl(r)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-3 font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <Navigation className="h-5 w-5" />
                Chỉ đường đến đây
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-slate-400">
            <p>Powered by scan2order.io.vn</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

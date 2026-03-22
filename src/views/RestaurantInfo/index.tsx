"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, MapPin, Minus, Plus, ShoppingCart, Tags, X } from "lucide-react";
import { MainLayout } from "@/components/ui/common";
import type { RestaurantMenuData, RestaurantSlugResponseData } from "@/types";
import { FALLBACK_RESTAURANT_IMAGE } from "@/constants";
import { ROUTES } from "@/constants/routes";
import { getRestaurantMenuFromRestaurantEndpoint } from "@/services/menuRestaurantTemplateService";

interface RestaurantInfoViewProps {
  restaurant: RestaurantSlugResponseData;
}

function buildDirectionsUrl(r: RestaurantSlugResponseData): string {
  const lat = r.latitude;
  const lng = r.longitude;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
    const dest = `${lat},${lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      dest
    )}`;
  }
  if (r.address?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      r.address.trim()
    )}`;
  }
  return "https://www.google.com/maps";
}

export default function RestaurantInfoView({
  restaurant: r,
}: RestaurantInfoViewProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [coverSrc, setCoverSrc] = useState(
    r.image || FALLBACK_RESTAURANT_IMAGE
  );
  const [menuData, setMenuData] = useState<RestaurantMenuData>({ sections: [], ungroupedDishes: [] });
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>("all");
  const [selectedDishes, setSelectedDishes] = useState<Record<string, number>>({});

  useEffect(() => {
    setCoverSrc(r.image || FALLBACK_RESTAURANT_IMAGE);
  }, [r.image]);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      setIsMenuLoading(true);
      setMenuError(null);
      try {
        const data = await getRestaurantMenuFromRestaurantEndpoint(r.id);
        if (cancelled) return;
        setMenuData(data);
        setActiveCategory("all");
      } catch {
        if (cancelled) return;
        setMenuData({ sections: [], ungroupedDishes: [] });
        setActiveCategory("all");
        setMenuError("Không thể tải menu của nhà hàng.");
      } finally {
        if (!cancelled) setIsMenuLoading(false);
      }
    }

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [r.id]);

  const activeSection = useMemo(
    () => menuData.sections.find((s) => s.id === activeCategory) ?? null,
    [menuData.sections, activeCategory]
  );

  const allDishes = useMemo(
    () => menuData.sections.flatMap((section) => section.dishes),
    [menuData.sections]
  );

  const visibleDishes = useMemo(() => {
    if (activeCategory === "all") return allDishes;
    return activeSection?.dishes ?? [];
  }, [activeCategory, activeSection, allDishes]);

  const totalSelectedItems = useMemo(
    () => Object.values(selectedDishes).reduce((sum, qty) => sum + qty, 0),
    [selectedDishes]
  );

  const hasSelectedDishes = totalSelectedItems > 0;

  const totalAmount = useMemo(
    () =>
      Object.entries(selectedDishes).reduce((sum, [dishId, qty]) => {
        const dish = allDishes.find((d) => d.id === dishId);
        if (!dish) return sum;
        const useDiscount =
          dish.hasPromotion &&
          typeof dish.discountedPrice === "number" &&
          dish.discountedPrice > 0 &&
          dish.discountedPrice !== dish.price;
        const unitPrice = (useDiscount ? dish.discountedPrice : dish.price) ?? 0;
        return sum + unitPrice * qty;
      }, 0),
    [selectedDishes, allDishes]
  );

  const distanceText =
    r.distanceKm != null ? `~ ${r.distanceKm.toFixed(1)} km` : "";
  const isOpened = r.isOpened;
  const statusLabel = isOpened ? "Đang mở cửa" : "Đã đóng cửa";
  const statusDot = isOpened ? "🟢" : "🔴";

  const formatVND = (value: number) =>
    value.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    });

  const promotionTypeLabel = (promoType?: number | null): string => {
    if (promoType === 1) return "Giờ vàng";
    if (promoType === 2) return "Xả hàng";
    if (promoType === 3) return "Ưu đãi trong tuần";
    return "Khuyến mãi";
  };

  const promotionTypeColor = (promoType?: number | null): string => {
    if (promoType === 1) return "#f97316";
    if (promoType === 2) return "#ef4444";
    if (promoType === 3) return "#06b6d4";
    return "#3b82f6";
  };

  function handleIncrementDish(dishId: string) {
    setSelectedDishes((prev) => ({
      ...prev,
      [dishId]: (prev[dishId] ?? 0) + 1,
    }));
  }

  function handleDecrementDish(dishId: string) {
    setSelectedDishes((prev) => {
      const current = prev[dishId] ?? 0;
      if (current <= 1) {
        const clone = { ...prev };
        delete clone[dishId];
        return clone;
      }
      return { ...prev, [dishId]: current - 1 };
    });
  }

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

        {/* Name, description, address, distance, status */}
        <section className="border-b border-slate-200 bg-white px-4 pb-4 pt-5">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {r.restaurantName}
          </h1>
          {r.description && (
            <p className="mt-1 text-slate-600">{r.description}</p>
          )}
          {r.address && (
            <p className="mt-1 text-sm text-slate-500">{r.address}</p>
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

        {/* Menu: category tabs + dish cards from GET_MENU endpoint */}
        <section className="px-4 py-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Thực đơn</h2>

          {isMenuLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Đang tải thực đơn...
            </div>
          )}

          {!isMenuLoading && menuError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-600">
              {menuError}
            </div>
          )}

          {!isMenuLoading && !menuError && menuData.sections.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Nhà hàng chưa có dữ liệu thực đơn.
            </div>
          )}

          {!isMenuLoading && !menuError && menuData.sections.length > 0 && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
                    activeCategory === "all"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  Tất cả
                </button>

                {menuData.sections.map((section) => {
                  const isActive = activeCategory === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveCategory(section.id)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
                        isActive
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {section.name}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {visibleDishes.map((dish) => {
                  const quantity = selectedDishes[dish.id] ?? 0;
                  const soldOut =
                    Boolean(dish.isSoldOut) ||
                    (typeof dish.dishAvailabilityStock === "number" && dish.dishAvailabilityStock <= 0);
                  const hasPromotion = Boolean(dish.hasPromotion);
                  const hasDiscountPrice =
                    hasPromotion &&
                    typeof dish.discountedPrice === "number" &&
                    dish.discountedPrice > 0 &&
                    dish.discountedPrice !== dish.price;
                  const displayPrice = hasDiscountPrice
                    ? (dish.discountedPrice as number)
                    : (dish.price ?? 0);

                  return (
                    <article
                      key={dish.id}
                      className={`relative flex min-h-[152px] gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:min-h-[168px] sm:p-4 ${
                        soldOut ? "opacity-50 grayscale-[0.25]" : ""
                      }`}
                    >
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            No Image
                          </div>
                        )}

                        {hasPromotion && (
                          <div
                            className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                            style={{ backgroundColor: promotionTypeColor(dish.promoType) }}
                          >
                            <Tags className="h-3 w-3" />
                            <span className="max-w-[6rem] truncate">{promotionTypeLabel(dish.promoType)}</span>
                          </div>
                        )}

                        {soldOut && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-semibold uppercase text-white">
                            Hết hàng
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex min-w-0 items-start gap-2">
                            <h3 className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">
                              {dish.name}
                            </h3>
                            {hasPromotion && dish.promotionLabel && (
                              <span
                                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                                title={dish.promotionName || dish.promotionLabel}
                              >
                                <Tags className="h-3 w-3" />
                                <span className="max-w-[9rem] truncate">{dish.promotionLabel}</span>
                              </span>
                            )}
                          </div>
                          {dish.description ? (
                            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-slate-500 sm:min-h-[3rem] sm:text-sm">
                              {dish.description}
                            </p>
                          ) : (
                            <div className="mt-1 min-h-[2.5rem] sm:min-h-[3rem]" />
                          )}
                        </div>

                        <div className="mt-1.5 flex items-end justify-between gap-2">
                          <div className="flex flex-col">
                            {hasDiscountPrice && dish.price != null ? (
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold text-emerald-700 sm:text-base">
                                  {formatVND(displayPrice)}
                                </span>
                                <span className="text-[11px] text-slate-400 line-through sm:text-xs">
                                  {formatVND(dish.price)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-emerald-700 sm:text-base">
                                {formatVND(displayPrice)}
                              </span>
                            )}
                            <span className="mt-0.5 text-[11px] text-slate-500">
                              SL: {typeof dish.dishAvailabilityStock === "number" ? dish.dishAvailabilityStock : "--"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {quantity > 0 ? (
                              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-slate-800 sm:px-3 sm:text-sm">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementDish(dish.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-700"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="mx-2 min-w-[1.5rem] text-center font-semibold">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleIncrementDish(dish.id)}
                                  disabled={soldOut}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleIncrementDish(dish.id)}
                                disabled={soldOut}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-4 sm:text-sm"
                              >
                                <Plus className="h-3 w-3" />
                                <span className="whitespace-nowrap">Thêm vào giỏ</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {visibleDishes.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                    Danh mục này chưa có món.
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {hasSelectedDishes && (
          <>
            <div className="h-20" />
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-emerald-600 px-4 py-3 shadow-2xl">
              <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <ShoppingCart className="h-5 w-5 text-white" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-extrabold text-white">
                      {totalSelectedItems}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/80">
                      {Object.keys(selectedDishes).length} món đã chọn
                    </p>
                    <p className="text-base font-extrabold text-white">
                      {totalAmount.toLocaleString("vi-VN")}đ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-emerald-700 shadow-md"
                >
                  Xem giỏ hàng
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

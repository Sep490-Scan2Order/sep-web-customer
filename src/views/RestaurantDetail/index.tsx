"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Info, X, ShoppingCart, Plus, Minus } from "lucide-react";
import { MainLayout } from "@/layouts";
import type {
  MenuRestaurantTemplateResponseData,
  RestaurantSlugResponseData,
} from "@/types";
import { ROUTES } from "@/routes";
import { FALLBACK_RESTAURANT_IMAGE } from "@/lib/constants";
import {
  getRestaurantGroupedMenu,
  getRestaurantMenuByDataMapping,
  getMenuRestaurantTemplateByRestaurantId,
  parseMenuLayoutConfig,
  type RestaurantMenuData,
} from "@/services/menuRestaurantTemplateService";

interface RestaurantDetailViewProps {
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

export default function RestaurantDetailView({
  restaurant: r,
}: RestaurantDetailViewProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [coverSrc, setCoverSrc] = useState(r.image || FALLBACK_RESTAURANT_IMAGE);
  const [menuTemplateData, setMenuTemplateData] =
    useState<MenuRestaurantTemplateResponseData | null>(null);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<RestaurantMenuData>({
    sections: [],
    ungroupedDishes: [],
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedDishes, setSelectedDishes] = useState<Record<string, number>>({});

  useEffect(() => {
    setCoverSrc(r.image || FALLBACK_RESTAURANT_IMAGE);
  }, [r.image]);

  useEffect(() => {
    let isCancelled = false;

    async function loadMenuTemplate() {
      setIsMenuLoading(true);
      setMenuError(null);

      try {
        // Try to fetch grouped menu first (new unified API)
        const groupedMenu = await getRestaurantGroupedMenu(r.id);
        if (isCancelled) return;

        if (groupedMenu.sections.length > 0) {
          // Successfully got pre-grouped menu data
          setMenuData(groupedMenu);
          setActiveCategory(groupedMenu.sections[0]?.id || null);
        } else {
          // Fallback: try template-based menu with dataMapping
          const data = await getMenuRestaurantTemplateByRestaurantId(r.id);
          if (isCancelled) return;

          setMenuTemplateData(data);
          const parsedLayout = parseMenuLayoutConfig(data?.menuTemplate?.layoutConfigJson);

          if (parsedLayout?.dataMapping) {
            const fetchedMenuData = await getRestaurantMenuByDataMapping(
              r.id,
              parsedLayout.dataMapping
            );
            if (!isCancelled) {
              setMenuData(fetchedMenuData);
              setActiveCategory(fetchedMenuData.sections[0]?.id || null);
            }
          } else {
            setMenuData({ sections: [], ungroupedDishes: [] });
            setActiveCategory(null);
          }
        }
      } catch {
        if (isCancelled) return;
        setMenuTemplateData(null);
        setMenuData({ sections: [], ungroupedDishes: [] });
        setMenuError("Không thể tải cấu hình menu từ hệ thống.");
      } finally {
        if (!isCancelled) {
          setIsMenuLoading(false);
        }
      }
    }

    loadMenuTemplate();

    return () => {
      isCancelled = true;
    };
  }, [r.id]);

  const activeSection = menuData.sections.find(s => s.id === activeCategory);

  const handleToggleDish = (dishId: string) => {
    setSelectedDishes(prev => {
      const newSelected = { ...prev };
      if (newSelected[dishId]) {
        delete newSelected[dishId];
      } else {
        newSelected[dishId] = 1;
      }
      return newSelected;
    });
  };

  const handleQuantityChange = (dishId: string, delta: number) => {
    setSelectedDishes(prev => {
      const currentQty = prev[dishId] || 0;
      const newQty = Math.max(1, currentQty + delta);
      return { ...prev, [dishId]: newQty };
    });
  };

  const totalSelectedItems = Object.values(selectedDishes).reduce((sum, qty) => sum + qty, 0);
  const hasSelectedDishes = Object.keys(selectedDishes).length > 0;

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
          {r.address && <p className="mt-1 text-sm text-slate-500">{r.address}</p>}
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

        {/* Menu: parsed from layoutConfigJson */}
        <section className="px-4 py-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Thực đơn
          </h2>

          {isMenuLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Đang tải mẫu menu...
            </div>
          )}

          {!isMenuLoading && menuError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-600">
              {menuError}
            </div>
          )}

          {!isMenuLoading && !menuError && menuData.sections.length === 0 && menuData.ungroupedDishes.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Nhà hàng này chưa có menu.
            </div>
          )}

          {!isMenuLoading && !menuError && (menuData.sections.length > 0 || menuData.ungroupedDishes.length > 0) && (
            <div className="space-y-4">
              {menuTemplateData && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    {menuTemplateData.menuTemplate.templateName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Template ID: {menuTemplateData.menuTemplate.id} • Menu Template ID: {menuTemplateData.menuTemplateId}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Màu chủ đạo: {menuTemplateData.menuTemplate.themeColor} • Font: {menuTemplateData.menuTemplate.fontFamily}
                  </p>
                </div>
              )}

              {menuData.sections.length > 0 && (
                <div className="space-y-4">
                  {/* Category tabs - horizontal scrollable */}
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 pb-2">
                      {menuData.sections.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setActiveCategory(section.id)}
                          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                            activeCategory === section.id
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          {section.name}
                          <span className="ml-1.5 text-xs opacity-75">
                            ({section.dishes.length})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active category dishes */}
                  {activeSection && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="text-base font-semibold text-slate-900">
                        {activeSection.name}
                      </h4>

                      {activeSection.dishes.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {activeSection.dishes.map((dish) => {
                            const isSelected = !!selectedDishes[dish.id];
                            const quantity = selectedDishes[dish.id] || 0;
                            
                            return (
                            <div
                              key={dish.id}
                              className={`rounded-lg border p-3 transition ${
                                dish.isSoldOut
                                  ? "border-slate-200 bg-slate-100 opacity-60"
                                  : isSelected
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div className="flex shrink-0 items-start pt-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={dish.isSoldOut}
                                    onChange={() => handleToggleDish(dish.id)}
                                    className="h-5 w-5 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                </div>

                                {dish.imageUrl && (
                                  <img
                                    src={dish.imageUrl}
                                    alt={dish.name}
                                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                )}
                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-800">{dish.name}</p>
                                        {dish.isSoldOut && (
                                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                            Hết hàng
                                          </span>
                                        )}
                                      </div>
                                      {dish.description && (
                                        <p className="mt-1 text-sm text-slate-500">{dish.description}</p>
                                      )}
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-emerald-700">
                                      {dish.price != null
                                        ? `${dish.price.toLocaleString("vi-VN")}đ`
                                        : "Liên hệ"}
                                    </p>
                                  </div>

                                  {/* Quantity controls */}
                                  {isSelected && !dish.isSoldOut && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(dish.id, -1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-100"
                                        disabled={quantity <= 1}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </button>
                                      <span className="flex h-8 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800">
                                        {quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(dish.id, 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-100"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                      <span className="ml-2 text-sm text-slate-600">
                                        Tổng: {((dish.price || 0) * quantity).toLocaleString("vi-VN")}đ
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )})}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          Danh mục này chưa có món.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {menuData.ungroupedDishes.length > 0 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="text-base font-semibold text-slate-900">
                      Món chưa phân loại
                    </h4>
                    <div className="mt-3 space-y-3">
                      {menuData.ungroupedDishes.map((dish) => {
                        const isSelected = !!selectedDishes[dish.id];
                        const quantity = selectedDishes[dish.id] || 0;
                        
                        return (
                        <div
                          key={dish.id}
                          className={`rounded-lg border p-3 transition ${
                            dish.isSoldOut
                              ? "border-slate-200 bg-slate-100 opacity-60"
                              : isSelected
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div className="flex shrink-0 items-start pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={dish.isSoldOut}
                                onChange={() => handleToggleDish(dish.id)}
                                className="h-5 w-5 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>

                            {dish.imageUrl && (
                              <img
                                src={dish.imageUrl}
                                alt={dish.name}
                                className="h-20 w-20 shrink-0 rounded-lg object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-800">{dish.name}</p>
                                    {dish.isSoldOut && (
                                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                        Hết hàng
                                      </span>
                                    )}
                                  </div>
                                  {dish.description && (
                                    <p className="mt-1 text-sm text-slate-500">{dish.description}</p>
                                  )}
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-emerald-700">
                                  {dish.price != null
                                    ? `${dish.price.toLocaleString("vi-VN")}đ`
                                    : "Liên hệ"}
                                </p>
                              </div>

                              {/* Quantity controls */}
                              {isSelected && !dish.isSoldOut && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(dish.id, -1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-100"
                                    disabled={quantity <= 1}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="flex h-8 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(dish.id, 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-100"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <span className="ml-2 text-sm text-slate-600">
                                    Tổng: {((dish.price || 0) * quantity).toLocaleString("vi-VN")}đ
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Floating order button */}
        {hasSelectedDishes && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-4 shadow-lg">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {Object.keys(selectedDishes).length} món • {totalSelectedItems} phần
                  </p>
                  <p className="text-xs text-slate-500">
                    {(() => {
                      const allDishes = [...menuData.sections.flatMap(s => s.dishes), ...menuData.ungroupedDishes];
                      const total = Object.entries(selectedDishes).reduce((sum, [dishId, qty]) => {
                        const dish = allDishes.find(d => d.id === dishId);
                        return sum + (dish?.price || 0) * qty;
                      }, 0);
                      return `${total.toLocaleString("vi-VN")}đ`;
                    })()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  // TODO: Navigate to order confirmation or open order modal
                  alert(`Đã chọn ${Object.keys(selectedDishes).length} món với tổng ${totalSelectedItems} phần`);
                }}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Xem đơn hàng
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

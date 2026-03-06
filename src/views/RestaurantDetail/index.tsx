"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, MapPin } from "lucide-react";
import { MainLayout } from "@/layouts";
import type {
  MenuLayoutConfig,
  MenuRestaurantTemplateResponseData,
  RestaurantSlugResponseData,
} from "@/types";
import { ROUTES } from "@/routes";
import { FALLBACK_RESTAURANT_IMAGE } from "@/lib/constants";
import {
  getRestaurantMenuFromTemplate,
  parseMenuLayoutConfig,
  type RestaurantMenuData,
} from "@/services/menuRestaurantTemplateService";
import MenuSection from "./components/MenuSection";
import RestaurantInfoModal from "./components/RestaurantInfoModal";
import OrderSummaryBar from "./components/OrderSummaryBar";

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
  const [layoutConfig, setLayoutConfig] = useState<MenuLayoutConfig | null>(null);
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
        // Fetch menu từ template - includes template data + menu data
        const result = await getRestaurantMenuFromTemplate(r.id);
        if (isCancelled) return;

        setMenuTemplateData(result.templateData);

        // Parse layout config từ template
        const layout = parseMenuLayoutConfig(result.templateData?.menuTemplate?.layoutConfigJson);
        setLayoutConfig(layout);

        setMenuData(result.menuData);
        setActiveCategory(result.menuData.sections[0]?.id || null);
      } catch {
        if (isCancelled) return;
        setMenuTemplateData(null);
        setLayoutConfig(null);
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

  const handleToggleDish = (dishId: string) => {
    setSelectedDishes((prev) => {
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
    setSelectedDishes((prev) => {
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
      <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF" }}>
        {/* Canvas container - responsive */}
        <div className="mx-auto w-full max-w-6xl">
          {/* Header Slot: responsive height and margins */}
          <header
            className="relative overflow-hidden bg-slate-200"
            style={{
              marginLeft: "clamp(12px, 2vw, 24px)",
              marginRight: "clamp(12px, 2vw, 24px)",
              marginTop: "clamp(12px, 2vw, 24px)",
              height: "clamp(80px, 25vw, 90px)",
              aspectRatio: "auto",
            }}
          >
            <img
              src={coverSrc}
              alt={r.restaurantName}
              className="h-full w-full object-cover"
              onError={() => setCoverSrc(FALLBACK_RESTAURANT_IMAGE)}
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute left-0 right-0 top-0 p-2 sm:p-4">
              <Link
                href={ROUTES.HOME}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white sm:px-3 sm:py-2 sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                Trở về
              </Link>
            </div>
          </header>

          {/* Info Section - responsive padding and margins */}
          <section
            className="border-b border-slate-200 bg-white px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-5"
            style={{
              marginLeft: "clamp(12px, 2vw, 24px)",
              marginRight: "clamp(12px, 2vw, 24px)",
            }}
          >
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
              {r.restaurantName}
            </h1>
            {r.description && (
              <p className="mt-1 text-xs text-slate-600 sm:text-sm">{r.description}</p>
            )}
            {r.address && <p className="mt-1 text-xs text-slate-500 sm:text-sm">{r.address}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:mt-3 sm:gap-3 sm:text-sm">
              {distanceText && (
                <span className="text-slate-500">{distanceText}</span>
              )}
              <span className="font-medium text-slate-700">
                {statusDot} {statusLabel}
              </span>
            </div>
          </section>

          {/* Action buttons - responsive */}
          <section
            className="flex flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:flex-row sm:gap-3 sm:px-4 sm:py-3"
            style={{
              marginLeft: "clamp(12px, 2vw, 24px)",
              marginRight: "clamp(12px, 2vw, 24px)",
            }}
          >
            <a
              href={buildDirectionsUrl(r)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:gap-2 sm:rounded-xl sm:py-2.5 sm:text-sm"
            >
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              Chỉ đường
            </a>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:gap-2 sm:rounded-xl sm:py-2.5 sm:text-sm"
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
              Thông tin quán
            </button>
          </section>

          <MenuSection
            menuData={menuData}
            menuTemplateData={menuTemplateData}
            layoutConfig={layoutConfig}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            selectedDishes={selectedDishes}
            onToggleDish={handleToggleDish}
            onQuantityChange={handleQuantityChange}
            isMenuLoading={isMenuLoading}
            menuError={menuError}
          />

          {/* Footer Slot: responsive */}
          <footer
            style={{
              marginLeft: "clamp(12px, 2vw, 24px)",
              marginRight: "clamp(12px, 2vw, 24px)",
              marginTop: "0px",
              minHeight: "clamp(60px, 15vw, 80px)",
              backgroundColor: "#FFFFFF",
              padding: "clamp(8px, 2vw, 16px)",
              borderTop: "1px solid #e2e8f0",
            }}
            className="flex items-center justify-center text-center text-xs text-slate-500 sm:text-sm"
          >
            <p>© 2026 Nhà hàng. Tất cả quyền được bảo lưu.</p>
          </footer>
        </div>
      </div>

      <RestaurantInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        restaurant={r}
        statusDot={statusDot}
        statusLabel={statusLabel}
      />

      <OrderSummaryBar
        hasSelectedDishes={hasSelectedDishes}
        selectedDishes={selectedDishes}
        totalSelectedItems={totalSelectedItems}
        menuData={menuData}
      />
    </MainLayout>
  );
}

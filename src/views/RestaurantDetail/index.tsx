"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  BellRing,
  Home,
  Landmark,
  MapPin,
  Clock,
  MoonStar,
  ReceiptText,
  Search,
  Star,
  SunMedium,
  ThermometerSun,
} from "lucide-react";
import { MainLayout } from "@/components/ui/common";
import type {
  MenuLayoutConfig,
  MenuRestaurantTemplateResponseData,
  RestaurantMenuData,
  RestaurantSlugResponseData,
} from "@/types";
import { ROUTES } from "@/constants/routes";
import { FALLBACK_RESTAURANT_IMAGE } from "@/constants";
import {
  getRestaurantMenuFromTemplate,
  parseMenuLayoutConfig,
} from "@/services/menuRestaurantTemplateService";
import MenuSection from "./components/MenuSection";
import RestaurantInfoModal from "./components/RestaurantInfoModal";
import OrderSummaryBar from "./components/OrderSummaryBar";

interface RestaurantDetailViewProps {
  restaurant: RestaurantSlugResponseData;
  initialMenuOpened?: boolean;
  menuOnly?: boolean;
}

function getTimeBasedGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
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
  initialMenuOpened = false,
  menuOnly = false,
}: RestaurantDetailViewProps) {
  const router = useRouter();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpened] = useState(initialMenuOpened);
  const [now, setNow] = useState<Date>(new Date());
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | null>(null);
  const [outdoorTemp, setOutdoorTemp] = useState<number | null>(null);

  useEffect(() => {
    setCoverSrc(r.image || FALLBACK_RESTAURANT_IMAGE);
  }, [r.image]);

  useEffect(() => {
    if (!menuOpened) return;

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
  }, [r.id, menuOpened]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const lat = r.latitude;
    const lng = r.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return;
    }

    let cancelled = false;

    async function fetchTemperature() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const t = data?.current_weather?.temperature;
        if (!cancelled && typeof t === "number") {
          setOutdoorTemp(t);
        }
      } catch {
        // ignore errors, giữ outdoorTemp = null
      }
    }

    fetchTemperature();

    return () => {
      cancelled = true;
    };
  }, [r.latitude, r.longitude]);

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
  const isReceivingOrders = r.isReceivingOrders;
  const statusLabel = isReceivingOrders ? "Đang nhận đơn" : "Tạm ngưng nhận đơn";
  const statusDot = isReceivingOrders ? "🟢" : "🔴";
  const timeGreeting = getTimeBasedGreeting(now);
  const greetingText = `${timeGreeting}, Khách hàng`;
  const hour = now.getHours();
  const isDaytime = hour >= 6 && hour < 18;

  const handleViewMenu = () => {
    router.push(`${ROUTES.MENU}?restaurant=${r.slug}`);
  };

  return (
    <MainLayout hideHeader hideFooter>
      {menuOnly ? (
        <div className="min-h-screen px-2 sm:px-4 lg:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <div className="sticky top-0 z-20 mb-2 bg-white/90 px-2 pb-2 pt-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Link
                  href={ROUTES.RESTAURANT_SLUG(r.slug)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-white text-orange-500 shadow-sm hover:bg-orange-50"
                  aria-label="Trang chủ"
                >
                  <Home className="h-4 w-4" />
                </Link>
                <label className="relative block flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What do you want to find?"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-orange-300"
                  />
                </label>
              </div>
            </div>

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
              searchQuery={searchQuery}
              menuOnly
            />
          </div>
        </div>
      ) : (
      <div className="flex min-h-[100dvh] flex-col bg-white px-0 py-0 sm:min-h-screen sm:bg-[#ECECEC] sm:px-4 sm:py-6 lg:px-6">
        <div className="mx-auto flex w-full flex-1 flex-col max-w-none bg-white p-3 sm:max-w-4xl sm:rounded-2xl sm:border sm:border-slate-200 sm:p-4 sm:shadow-sm lg:p-5">
          <header>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  
                  <h1 className="text-xl font-bold uppercase text-slate-800">{r.restaurantName}</h1>
                </div>
                {r.address && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{r.address}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
              >
                VN
              </button>
            </div>
          </header>

          <section className="mt-3 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
            <img
              src={coverSrc}
              alt={r.restaurantName}
              className="h-44 w-full object-cover"
              onError={() => setCoverSrc(FALLBACK_RESTAURANT_IMAGE)}
            />
          </section>

          <section className="mt-3 rounded-xl bg-white p-3">
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-800">
              {greetingText}
            </h2>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  {statusDot} {statusLabel}
                </span>
                {distanceText && <span>• {distanceText}</span>}
              </div>

              <div className="flex items-center gap-1 whitespace-nowrap">
                {isDaytime ? (
                  <SunMedium className="h-4 w-4 text-amber-400" />
                ) : (
                  <MoonStar className="h-4 w-4 text-sky-500" />
                )}
                <span className="text-slate-600">
                  {typeof outdoorTemp === "number"
                    ? `${outdoorTemp.toFixed(1)}°C`
                    : "—"}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowPaymentMethod(true)}
              className="flex h-20 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-xs font-semibold text-slate-700 shadow-sm"
            >
              <ReceiptText className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-semibold leading-tight text-slate-800 sm:text-base">
                Tra cứu hóa đơn
              </span>
            </button>

            <button
              type="button"
              className="flex h-20 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-xs font-semibold text-slate-600 shadow-sm"
            >
              <Clock className="h-5 w-5 text-slate-500" />
              <span className="text-sm font-semibold leading-tight text-slate-800 sm:text-base">
                Xem lịch sử đơn
              </span>
            </button>
          </section>

          <section className="mt-5">
            <button
              type="button"
              onClick={handleViewMenu}
              className="flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-[#F58A1F] to-[#F2CE59] px-5 py-5 text-left text-xl font-bold text-white shadow-sm transition hover:brightness-95 sm:py-6 sm:text-3xl"
            >
              <span>View Menu - Order food</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/35 text-xl">
                ›
              </span>
            </button>
          </section>

          {menuOpened && (
            <div className="mt-4">
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
            </div>
          )}

          <footer className="mt-auto pb-2 text-center text-xs text-slate-400">
            <p>Powered by scan2order.io.vn</p>
          </footer>
        </div>
      </div>
      )}

      {!menuOnly && (
        <RestaurantInfoModal
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          restaurant={r}
          statusDot={statusDot}
          statusLabel={statusLabel}
        />
      )}

      {showPaymentMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Bạn muốn thanh toán bằng?</p>
              <button
                type="button"
                onClick={() => setShowPaymentMethod(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  paymentMethod === "cash"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Banknote className="h-4 w-4" />
                Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  paymentMethod === "transfer"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Landmark className="h-4 w-4" />
                Chuyển khoản
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentMethod(false)}
              disabled={!paymentMethod}
              className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      <OrderSummaryBar
        hasSelectedDishes={hasSelectedDishes}
        selectedDishes={selectedDishes}
        totalSelectedItems={totalSelectedItems}
        menuData={menuData}
      />
    </MainLayout>
  );
}

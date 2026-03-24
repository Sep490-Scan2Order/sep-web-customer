"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Tags,
  X,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API, API_BASE_URL } from "@/services/api";
import {
  addToCart,
  CART_DATA_STORAGE_KEY,
  CART_ID_STORAGE_KEY,
  type CartResponse,
} from "@/services/orderCustomerService";

type DishDto = {
  dishId: number;
  dishName: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  discountedPrice: number | null;
  isSoldOut: boolean;
  hasPromotion: boolean;
  promotionLabel: string | null;
  promotionName?: string | null;
  dishAvailabilityStock: number | null;
  promoType?: number | null;
  expiredAt?: string | null;
};

type CategoryDto = {
  categoryId: number;
  categoryName: string;
  dishes: DishDto[];
};

type MenuTemplateApiResponse = {
  success?: boolean;
  isSuccess?: boolean;
  message?: string | null;
  data?: {
    templateId: number;
    restaurantId: number;
    themeColor: string;
    fontFamily: string;
    layoutConfigJson: string;
    menuData: CategoryDto[];
  } | null;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      data: CategoryDto[];
      layoutConfigJson: string | null;
      themeColor: string | null;
      fontFamily: string | null;
    }
  | { status: "error"; error: string };

type LayoutCanvasConfig = {
  width?: number;
  height?: number;
  backgroundMode?: "color" | "image" | string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
};

type LayoutCardConfig = {
  themeColor?: string;
  priceColorMode?: string;
};

type LayoutConfig = {
  version?: number;
  canvas?: LayoutCanvasConfig;
  card?: LayoutCardConfig;
  themeColor?: string;

};

function formatVND(value: number): string {
  return value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

interface DishCardProps {
  dish: DishDto;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  themeColor: string;
}

function DishCard({
  dish,
  quantity,
  onIncrement,
  onDecrement,
  themeColor,
}: DishCardProps) {
  const {
    dishName,
    description,
    imageUrl,
    price,
    discountedPrice,
    isSoldOut,
    hasPromotion,
    promotionLabel,
    promotionName,
    dishAvailabilityStock,
    promoType,
  } = dish;

  const soldOut = isSoldOut || !dishAvailabilityStock;

  const displayPrice =
    hasPromotion && discountedPrice && discountedPrice > 0
      ? discountedPrice
      : price;

  return (
    <div
      className={`relative flex h-[152px] gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:h-[168px] sm:p-4 ${
        soldOut ? "opacity-50 grayscale-[0.3]" : ""
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
        {imageUrl ? (
          <Image src={imageUrl} alt={dishName} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No Image
          </div>
        )}

        {hasPromotion && typeof promoType === "number" && (
          <div
            className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
            style={{
              backgroundColor:
                promoType === 0
                  ? "#3b82f6" // Khuyến mãi thường
                  : promoType === 1
                  ? "#f97316" // Giờ vàng
                  : promoType === 2
                  ? "#ef4444" // Xả hàng
                  : promoType === 3
                  ? "#06b6d4" // Ưu đãi trong tuần
                  : "#6b7280", 
            }}
          >
            <Tags className="h-3 w-3" />
            <span className="max-w-[6rem] truncate">
              {promoType === 0
                ? "Khuyến mãi"
                : promoType === 1
                ? "Giờ vàng"
                : promoType === 2
                ? "Xả hàng"
                : promoType === 3
                ? "Ưu đãi trong tuần"
                : "Khuyến mãi"}
            </span>
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
              {dishName}
            </h3>
            {hasPromotion && promotionLabel && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: themeColor }}
                title={promotionName || promotionLabel}
              >
                <Tags className="h-3 w-3" />
                <span className="max-w-[9rem] truncate">{promotionLabel}</span>
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-slate-500 sm:min-h-[3rem] sm:text-sm">
              {description}
            </p>
          )}
          {!description && (
            <div className="mt-1 min-h-[2.5rem] sm:min-h-[3rem]" />
          )}
        </div>

        <div className="mt-1.5 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {hasPromotion &&
            discountedPrice &&
            discountedPrice > 0 &&
            discountedPrice !== price ? (
              <div className="flex items-baseline gap-2">
                <span
                  className="text-sm font-semibold sm:text-base"
                  style={{ color: themeColor }}
                >
                  {formatVND(discountedPrice)}
                </span>
                <span className="text-[11px] text-slate-400 line-through sm:text-xs">
                  {formatVND(price)}
                </span>
              </div>
            ) : (
              <span
                className="text-sm font-semibold sm:text-base"
                style={{ color: themeColor }}
              >
                {formatVND(displayPrice)}
              </span>
            )}
            {typeof dishAvailabilityStock === "number" && dishAvailabilityStock > 0 && (
              <span className="mt-0.5 text-[11px] text-slate-500">
                SL: {dishAvailabilityStock}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {quantity > 0 ? (
              <div
                className="inline-flex items-center rounded-full border px-2 py-1 text-xs text-slate-800 sm:px-3 sm:text-sm"
                style={{
                  borderColor: themeColor,
                  backgroundColor: `${themeColor}14`,
                }}
              >
                <button
                  type="button"
                  onClick={onDecrement}
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ color: themeColor }}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="mx-2 min-w-[1.5rem] text-center font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={onIncrement}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: themeColor }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onIncrement}
                disabled={soldOut}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-4 sm:text-sm"
                style={soldOut ? undefined : { backgroundColor: themeColor }}
              >
                <Plus className="h-3 w-3" />
                <span className="whitespace-nowrap">Thêm vào giỏ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoryNavProps {
  categories: CategoryDto[];
  activeCategoryId: number | null;
  onChange: (id: number | null) => void;
  themeColor: string;
}

function CategoryNav({
  categories,
  activeCategoryId,
  onChange,
  themeColor,
}: CategoryNavProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium sm:px-4 sm:text-sm ${
          activeCategoryId === null
            ? "text-white"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
        style={
          activeCategoryId === null
            ? { backgroundColor: themeColor, borderColor: themeColor }
            : undefined
        }
      >
        Tất cả
      </button>
      {categories.map((cat) => (
        <button
          key={cat.categoryId}
          type="button"
          onClick={() => onChange(cat.categoryId)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium sm:px-4 sm:text-sm ${
            activeCategoryId === cat.categoryId
              ? "text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          style={
            activeCategoryId === cat.categoryId
              ? { backgroundColor: themeColor, borderColor: themeColor }
              : undefined
          }
        >
          {cat.categoryName}
        </button>
      ))}
    </div>
  );
}

function DishCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-slate-200 sm:h-28 sm:w-28" />
      <div className="flex flex-1 flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

type ToastItem = {
  id: number;
  type: "success" | "warning";
  message: string;
};

function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed right-3 top-16 z-[60] flex flex-col gap-2 sm:right-4 sm:top-20">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur-sm transition-all sm:px-4 sm:py-3 ${
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
          style={{ minWidth: "220px", maxWidth: "320px" }}
        >
          <span className="mt-0.5 shrink-0">
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </span>
          <p className="flex-1 text-xs font-semibold leading-snug sm:text-sm">{t.message}</p>
          <button
            type="button"
            onClick={() => onRemove(t.id)}
            className="shrink-0 opacity-50 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

type StockWarning = {
  dishName: string;
  sentQty: number;
  actualQty: number;
};

// BƯỚC 1: Tách logic chính ra một component riêng (MenuContent)
function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantParamRaw = searchParams.get("restaurant") ?? "";
  const restaurantParam = restaurantParamRaw
    ? decodeURIComponent(restaurantParamRaw.trim())
    : "";

  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // Cart API states
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartData, setCartData] = useState<CartResponse | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = { current: 0 };

  useEffect(() => {
    if (!restaurantParam) {
      setState({
        status: "error",
        error: "Thiếu restaurant slug trong URL.",
      });
      return;
    }

    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const infoRes = await fetch(
          `${API_BASE_URL}${API.RESTAURANT.GET_BY_SLUG(restaurantParam)}`
        );
        if (!infoRes.ok) {
          throw new Error(`Không lấy được thông tin nhà hàng (${infoRes.status}).`);
        }
        const infoJson = await infoRes.json();
        const restaurantId: number | undefined = infoJson?.data?.id;
        if (!restaurantId) {
          throw new Error("Dữ liệu nhà hàng không hợp lệ (không có id).");
        }
        if (!cancelled) setRestaurantId(restaurantId);

        const res = await fetch(
          `${API_BASE_URL}/MenuTemplate/restaurant/${restaurantId}/template`
        );

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const raw = (await res.json()) as MenuTemplateApiResponse;
        const data: CategoryDto[] = Array.isArray(raw)
          ? (raw as unknown as CategoryDto[])
          : Array.isArray(raw?.data?.menuData)
          ? raw.data!.menuData
          : [];
        const layoutConfigJson = raw?.data?.layoutConfigJson ?? null;
        const rawThemeColor = raw?.data?.themeColor ?? null;
        const rawFontFamily = raw?.data?.fontFamily ?? null;
        if (!cancelled) {
          setState({
            status: "success",
            data,
            layoutConfigJson,
            themeColor: typeof rawThemeColor === "string" ? rawThemeColor : null,
            fontFamily: typeof rawFontFamily === "string" ? rawFontFamily : null,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setState({
            status: "error",
            error:
              (e as Error)?.message || "Không thể tải menu. Vui lòng thử lại sau ít phút.",
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [restaurantParam]);

  const categories = state.status === "success" ? state.data : [];

  const themeColor = useMemo(() => {
    if (state.status !== "success") return "#22c55e";

    const direct = state.themeColor?.trim();

    let fromLayout: string | null = null;
    try {
      const parsed = state.layoutConfigJson
        ? (JSON.parse(state.layoutConfigJson) as LayoutConfig)
        : null;
      fromLayout =
        parsed?.themeColor ??
        parsed?.card?.themeColor ??
        null;
    } catch {
      fromLayout = null;
    }

    const resolved = direct || fromLayout;
    return resolved && resolved.trim() ? resolved.trim() : "#22c55e";
  }, [state]);

  const fontFamily = useMemo(() => {
    if (state.status !== "success") return undefined;

    const direct = state.fontFamily?.trim();
    if (direct) return direct;

    try {
      const parsed = state.layoutConfigJson
        ? (JSON.parse(state.layoutConfigJson) as LayoutConfig & {
            canvas?: LayoutCanvasConfig & { fontFamily?: string };
          })
        : null;
      const fromLayout = parsed?.canvas?.fontFamily;
      return fromLayout?.trim() || undefined;
    } catch {
      return undefined;
    }
  }, [state]);

  const filteredCategories = useMemo(() => {
    if (state.status !== "success") return [];

    const term = searchTerm.trim().toLowerCase();

    return state.data
      .filter((cat) =>
        activeCategoryId === null ? true : cat.categoryId === activeCategoryId
      )
      .map((cat) => ({
        ...cat,
        dishes: cat.dishes.filter((dish) => {
          if (!term) return true;
          const haystack = `${dish.dishName} ${dish.description ?? ""}`.toLowerCase();
          return haystack.includes(term);
        }),
      }))
      .filter((cat) => cat.dishes.length > 0);
  }, [state, activeCategoryId, searchTerm]);

  const handleIncrement = (dishId: number) => {
    setQuantities((prev) => ({
      ...prev,
      [dishId]: (prev[dishId] ?? 0) + 1,
    }));
  };

  const handleDecrement = (dishId: number) => {
    setQuantities((prev) => {
      const current = prev[dishId] ?? 0;
      if (current <= 1) {
        const clone = { ...prev };
        delete clone[dishId];
        return clone;
      }
      return { ...prev, [dishId]: current - 1 };
    });
  };

  // Tất cả món trong menu (để tra tên khi cần)
  const allDishes = useMemo(
    () => categories.flatMap((c) => c.dishes),
    [categories]
  );

  const totalSelectedItems = useMemo(
    () => Object.values(quantities).reduce((s, q) => s + q, 0),
    [quantities]
  );

  const totalAmount = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [dishIdStr, qty]) => {
        const id = parseInt(dishIdStr, 10);
        const dish = allDishes.find((d) => d.dishId === id);
        if (!dish) return sum;
        const price =
          dish.hasPromotion && dish.discountedPrice && dish.discountedPrice > 0
            ? dish.discountedPrice
            : dish.price;
        return sum + price * qty;
      }, 0),
    [quantities, allDishes]
  );

  function pushToast(type: ToastItem["type"], message: string) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleAddToCart() {
    if (!restaurantId) return;
    setCartLoading(true);
    setCartError(null);

    const storageKey = CART_ID_STORAGE_KEY(restaurantId);
    let cartId: string | null =
      typeof window !== "undefined"
        ? window.localStorage.getItem(storageKey)
        : null;

    // Ghi lại những gì FE đã gửi để so sánh với response sau
    const sentMap: Record<number, { dishName: string; qty: number }> = {};

    try {
      let lastCart: CartResponse | null = null;

      for (const [dishIdStr, quantity] of Object.entries(quantities)) {
        const dishId = parseInt(dishIdStr, 10);
        if (isNaN(dishId) || quantity <= 0) continue;

        const dish = allDishes.find((d) => d.dishId === dishId);
        if (!dish) continue;

        sentMap[dishId] = { dishName: dish.dishName, qty: quantity };

        const result = await addToCart({
          restaurantId,
          dishId,
          quantity,
          cartId,
        });

        cartId = result.cartId;
        lastCart = result;

        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, cartId);
        }
      }

      if (lastCart) {
        // So sánh sent vs response để phát hiện điều chỉnh tồn kho
        const warnings: StockWarning[] = [];
        for (const [dishIdStr, info] of Object.entries(sentMap)) {
          const dishId = parseInt(dishIdStr, 10);
          const responseItem = lastCart.items.find((i) => i.dishId === dishId);
          if (!responseItem) {
            warnings.push({ dishName: info.dishName, sentQty: info.qty, actualQty: 0 });
          } else if (responseItem.quantity < info.qty) {
            warnings.push({
              dishName: info.dishName,
              sentQty: info.qty,
              actualQty: responseItem.quantity,
            });
          }
        }

        // Hiện toast cảnh báo tồn kho
        for (const w of warnings) {
          if (w.actualQty === 0) {
            pushToast("warning", `"${w.dishName}" đã hết hàng, bị xóa khỏi giỏ.`);
          } else {
            pushToast(
              "warning",
              `"${w.dishName}" chỉ còn ${w.actualQty} (bạn chọn ${w.sentQty}), đã điều chỉnh lại.`
            );
          }
        }

        // Toast thành công nếu không có cảnh báo
        if (warnings.length === 0) {
          pushToast("success", `Đã thêm ${Object.keys(sentMap).length} món vào giỏ hàng!`);
        }

        setCartData(lastCart);
        setQuantities({});

        // Lưu cart data vào localStorage để trang checkout đọc sau
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            CART_DATA_STORAGE_KEY(lastCart.cartId),
            JSON.stringify(lastCart)
          );
        }
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (e as Error)?.message ||
        "Không thể thêm vào giỏ. Vui lòng thử lại.";
      setCartError(msg);
    } finally {
      setCartLoading(false);
    }
  }

  const canvasConfig: LayoutCanvasConfig =
    state.status === "success"
      ? (() => {
          try {
            const parsed = state.layoutConfigJson
              ? (JSON.parse(state.layoutConfigJson) as LayoutConfig)
              : null;
            return parsed?.canvas ?? {};
          } catch {
            return {};
          }
        })()
      : {};

  const backgroundStyles: React.CSSProperties = (() => {
    const styles: React.CSSProperties = {};
    if (canvasConfig.backgroundMode === "image" && canvasConfig.backgroundImageUrl) {
      styles.backgroundImage = `url('${canvasConfig.backgroundImageUrl}')`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
      styles.backgroundRepeat = "no-repeat";
    } else if (canvasConfig.backgroundColor) {
      styles.backgroundColor = canvasConfig.backgroundColor;
    } else {
      styles.backgroundColor = "#f8fafc";
    }
    return styles;
  })();

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{
        ...backgroundStyles,
        fontFamily: fontFamily || undefined,
      }}
    >
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          {restaurantParam && (
            <Link
              href={ROUTES.RESTAURANT_SLUG(restaurantParam)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              aria-label="Trang nhà hàng"
            >
              <span className="text-lg leading-none">‹</span>
            </Link>
          )}
          <div className="flex-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm món ăn, đồ uống..."
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 sm:h-10 sm:text-base"
                style={
                  {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore - CSSProperties index signature for CSS vars
                    "--tw-ring-color": themeColor,
                  } as React.CSSProperties
                }
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              if (cartData) {
                const params = new URLSearchParams({
                  cartId: cartData.cartId,
                  restaurant: restaurantParam,
                  ...(restaurantId ? { restaurantId: String(restaurantId) } : {}),
                });
                router.push(`/checkout?${params.toString()}`);
              }
            }}
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm transition"
            aria-label="Giỏ hàng"
            style={{
              borderColor: `${themeColor}40`,
              backgroundColor: `${themeColor}14`,
              color: themeColor,
            }}
          >
            <ShoppingCart className="h-4 w-4" />
            {cartData && (() => {
              const count = cartData.items.reduce((s, i) => s + i.quantity, 0);
              if (count === 0) return null;
              return (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white shadow">
                  {count > 99 ? "99+" : count}
                </span>
              );
            })()}
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
        {state.status === "success" && categories.length > 0 && (
          <CategoryNav
            categories={categories}
            activeCategoryId={activeCategoryId}
            onChange={setActiveCategoryId}
            themeColor={themeColor}
          />
        )}

        {state.status === "loading" && (
          <div className="space-y-3">
            <DishCardSkeleton />
            <DishCardSkeleton />
            <DishCardSkeleton />
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:px-4 sm:py-3">
            <AlertCircle className="h-4 w-4" />
            <span>{state.error}</span>
          </div>
        )}

        {state.status === "success" &&
          filteredCategories.length === 0 &&
          !categories.some((c) => c.dishes.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Nhà hàng này hiện chưa có món nào trong menu.
            </div>
          )}

        {state.status === "success" &&
          filteredCategories.length === 0 &&
          categories.some((c) => c.dishes.length > 0) &&
          searchTerm.trim() && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Không tìm thấy món phù hợp với từ khóa{" "}
              <span className="font-semibold">&quot;{searchTerm}&quot;</span>.
            </div>
          )}

        {state.status === "success" && filteredCategories.length > 0 && (
          <div className="space-y-6">
            {filteredCategories.map((cat) => (
              <section key={cat.categoryId} className="space-y-3">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                  {cat.categoryName}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
                  {cat.dishes.map((dish) => (
                    <DishCard
                      key={dish.dishId}
                      dish={dish}
                      quantity={quantities[dish.dishId] ?? 0}
                      onIncrement={() => handleIncrement(dish.dishId)}
                      onDecrement={() => handleDecrement(dish.dishId)}
                      themeColor={themeColor}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {state.status === "loading" && (
          <div className="flex justify-center pt-2">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {/* Khoảng trống để sticky bar không che nội dung */}
        {totalSelectedItems > 0 && <div className="h-20" />}
      </main>

      {/* Sticky bar — hiện khi có món trong giỏ */}
      {totalSelectedItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl">
          <div
            className="px-3 py-3 font-sans sm:px-4"
            style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc)` }}
          >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <ShoppingCart className="h-5 w-5 text-white" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-extrabold text-white shadow">
                    {totalSelectedItems}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/85">
                    {Object.keys(quantities).length} món đã chọn
                  </p>
                  <p className="text-base font-bold text-white">
                    {formatVND(totalAmount)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={cartLoading}
                onClick={handleAddToCart}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-md transition active:scale-95 disabled:opacity-60 sm:px-6 sm:py-3 sm:text-base"
                style={{ color: themeColor }}
              >
                {cartLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang xử lý…</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    <span>Thêm vào giỏ</span>
                  </>
                )}
              </button>
            </div>

            {cartError && (
              <p className="mt-1.5 text-center text-xs font-semibold text-white/90">
                ⚠ {cartError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Toast notifications góc phải */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// BƯỚC 2: Export Component chính được bọc trong Suspense
export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
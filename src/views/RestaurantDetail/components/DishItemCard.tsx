import { Minus, Plus, Tags } from "lucide-react";
import type { MenuDishItem } from "@/types";

interface DishItemCardProps {
  dish: MenuDishItem;
  isSelected: boolean;
  quantity: number;
  onToggleDish: (dishId: string) => void;
  onQuantityChange: (dishId: string, delta: number) => void;
}

export default function DishItemCard({
  dish,
  isSelected,
  quantity,
  onToggleDish,
  onQuantityChange,
}: DishItemCardProps) {
  const hasPromotion = Boolean(dish.hasPromotion);
  const hasDiscountPrice =
    hasPromotion &&
    typeof dish.discountedPrice === "number" &&
    dish.discountedPrice > 0 &&
    dish.discountedPrice !== dish.price;

  const displayPrice =
    hasDiscountPrice && typeof dish.discountedPrice === "number"
      ? dish.discountedPrice
      : dish.price;

  const soldOutByStock =
    typeof dish.dishAvailabilityStock === "number" && dish.dishAvailabilityStock <= 0;
  const isSoldOut = Boolean(dish.isSoldOut || soldOutByStock);

  const promoTypeLabel = (promoType?: number | null): string => {
    if (promoType === 1) return "Giờ vàng";
    if (promoType === 2) return "Xả hàng";
    if (promoType === 3) return "Ưu đãi tuần";
    return "Khuyến mãi";
  };

  const promoTypeColor = (promoType?: number | null): string => {
    if (promoType === 1) return "#f97316";
    if (promoType === 2) return "#ef4444";
    if (promoType === 3) return "#06b6d4";
    return "#3b82f6";
  };

  return (
    <div
      className={`rounded-lg border p-2 transition sm:p-3 ${
        isSoldOut
          ? "border-slate-200 bg-slate-100 opacity-60"
          : isSelected
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex shrink-0 items-start pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isSoldOut}
            onChange={() => onToggleDish(dish.id)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 sm:h-5 sm:w-5"
          />
        </div>

        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-20 sm:w-20">
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={dish.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          {hasPromotion && (
            <span
              className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full px-1 py-0.5 text-[9px] font-semibold text-white shadow-sm"
              style={{ backgroundColor: promoTypeColor(dish.promoType) }}
            >
              <Tags className="h-2.5 w-2.5" />
              <span className="max-w-[4rem] truncate">{promoTypeLabel(dish.promoType)}</span>
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-2">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <p className="text-xs font-medium text-slate-800 sm:text-sm">{dish.name}</p>
                {hasPromotion && dish.promotionLabel && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white sm:px-2"
                    title={dish.promotionName || dish.promotionLabel}
                  >
                    <Tags className="h-2.5 w-2.5" />
                    <span className="max-w-[6rem] truncate">{dish.promotionLabel}</span>
                  </span>
                )}
                {isSoldOut && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700 sm:px-2">
                    Hết hàng
                  </span>
                )}
              </div>
              {dish.description && (
                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1">{dish.description}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              {hasDiscountPrice && dish.price != null ? (
                <>
                  <p className="text-xs font-semibold text-emerald-700 sm:text-sm">
                    {displayPrice != null ? `${displayPrice.toLocaleString("vi-VN")}đ` : "Liên hệ"}
                  </p>
                  <p className="text-[10px] text-slate-400 line-through sm:text-xs">
                    {`${dish.price.toLocaleString("vi-VN")}đ`}
                  </p>
                </>
              ) : (
                <p className="text-xs font-semibold text-emerald-700 sm:text-sm">
                  {displayPrice != null ? `${displayPrice.toLocaleString("vi-VN")}đ` : "Liên hệ"}
                </p>
              )}
              {typeof dish.dishAvailabilityStock === "number" && (
                <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                  SL: {dish.dishAvailabilityStock}
                </p>
              )}
            </div>
          </div>

          {isSelected && !isSoldOut && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => onQuantityChange(dish.id, -1)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-100 sm:h-8 sm:w-8"
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <span className="flex h-6 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 sm:h-8 sm:w-12 sm:text-sm">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(dish.id, 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-100 sm:h-8 sm:w-8"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <span className="text-xs text-slate-600 sm:text-sm">
                Tổng: {((dish.price || 0) * quantity).toLocaleString("vi-VN")}đ
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

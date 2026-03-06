import { Minus, Plus } from "lucide-react";
import type { MenuDishItem } from "@/services/menuRestaurantTemplateService";

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
  return (
    <div
      className={`rounded-lg border p-2 transition sm:p-3 ${
        dish.isSoldOut
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
            disabled={dish.isSoldOut}
            onChange={() => onToggleDish(dish.id)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 sm:h-5 sm:w-5"
          />
        </div>

        {dish.imageUrl && (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-2">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <p className="text-xs font-medium text-slate-800 sm:text-sm">{dish.name}</p>
                {dish.isSoldOut && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700 sm:px-2">
                    Hết hàng
                  </span>
                )}
              </div>
              {dish.description && (
                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1">{dish.description}</p>
              )}
            </div>
            <p className="shrink-0 text-xs font-semibold text-emerald-700 sm:text-sm">
              {dish.price != null ? `${dish.price.toLocaleString("vi-VN")}đ` : "Liên hệ"}
            </p>
          </div>

          {isSelected && !dish.isSoldOut && (
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

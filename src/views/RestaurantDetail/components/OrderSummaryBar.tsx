import { ShoppingCart } from "lucide-react";
import type { RestaurantMenuData } from "@/types";

interface OrderSummaryBarProps {
  hasSelectedDishes: boolean;
  selectedDishes: Record<string, number>;
  totalSelectedItems: number;
  menuData: RestaurantMenuData;
}

export default function OrderSummaryBar({
  hasSelectedDishes,
  selectedDishes,
  totalSelectedItems,
  menuData,
}: OrderSummaryBarProps) {
  if (!hasSelectedDishes) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-2 shadow-lg sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 sm:flex-row sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 sm:h-10 sm:w-10">
            <ShoppingCart className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 sm:text-sm">
              {Object.keys(selectedDishes).length} món • {totalSelectedItems} phần
            </p>
            <p className="text-xs text-slate-500">
              {(() => {
                const allDishes = [
                  ...menuData.sections.flatMap((s) => s.dishes),
                  ...menuData.ungroupedDishes,
                ];
                const total = Object.entries(selectedDishes).reduce((sum, [dishId, qty]) => {
                  const dish = allDishes.find((d) => d.id === dishId);
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
            alert(`Đã chọn ${Object.keys(selectedDishes).length} món với tổng ${totalSelectedItems} phần`);
          }}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto sm:rounded-xl sm:px-6 sm:py-2.5 sm:text-sm"
        >
          Xem đơn hàng
        </button>
      </div>
    </div>
  );
}

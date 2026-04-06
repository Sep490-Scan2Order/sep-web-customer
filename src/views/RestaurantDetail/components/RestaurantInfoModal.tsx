import { X } from "lucide-react";
import type { RestaurantSlugResponseData } from "@/types";

interface RestaurantInfoModalProps {
  open: boolean;
  onClose: () => void;
  restaurant: RestaurantSlugResponseData;
  statusDot: string;
  statusLabel: string;
}

export default function RestaurantInfoModal({
  open,
  onClose,
  restaurant,
  statusDot,
  statusLabel,
}: RestaurantInfoModalProps) {
  if (!open) return null;

  const formatTimeHHmm = (t?: string | null) => {
    if (!t) return "--:--";
    const trimmed = t.trim();
    if (trimmed.length >= 5) return trimmed.slice(0, 5);
    return trimmed;
  };
  const scheduleText = `Thứ 2 - Chủ nhật: ${formatTimeHHmm(restaurant.openTime)} - ${formatTimeHHmm(
    restaurant.closeTime
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Thông tin quán"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Thông tin quán</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
          <div>
            <dt className="font-medium text-slate-500">Lịch bán</dt>
            <dd className="mt-0.5 text-slate-800">{scheduleText}</dd>
          </div>
          {restaurant.phone && (
            <div>
              <dt className="font-medium text-slate-500">Điện thoại</dt>
              <dd className="mt-0.5">
                <a href={`tel:${restaurant.phone}`} className="text-emerald-600 hover:underline">
                  {restaurant.phone}
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
          {restaurant.isOpened && !restaurant.isReceivingOrders && (
            <div>
              <dt className="font-medium text-slate-500">Ghi chú</dt>
              <dd className="mt-0.5 text-amber-700">
                Quán tạm ngưng nhận đơn do số lượng đông
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-3 text-xs text-slate-400 sm:mt-4">
          Giờ mở/đóng cửa sẽ cập nhật khi có từ nhà hàng.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800 sm:mt-4 sm:rounded-xl sm:py-2.5 sm:text-sm"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

export const runtime = 'edge';
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRestaurantBySlug } from "@/services";
import RestaurantDetailView from "@/views/RestaurantDetail";

interface RestaurantDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RestaurantDetailPage({ params }: RestaurantDetailPageProps) {
  // 1. Xử lý Logic lấy tham số (Controller)
  const { slug } = await params;

  // 2. Xử lý Logic lấy dữ liệu (Service)
  const restaurant = await getRestaurantBySlug(slug);

  // 3. Xử lý logic điều hướng
  if (!restaurant) {
    notFound();
  }

  // 4. Nhà hàng không còn hoạt động → hiển thị trang thông báo thân thiện
  if (!restaurant.isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 px-4">
        {/* Animated sad face */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute h-40 w-40 animate-ping rounded-full bg-orange-100 opacity-30" />
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-orange-100">
            <svg viewBox="0 0 100 100" className="h-20 w-20" aria-hidden="true">
              {/* Face */}
              <circle cx="50" cy="50" r="48" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
              {/* Left eye */}
              <ellipse cx="35" cy="38" rx="5" ry="6" fill="#374151" />
              {/* Right eye */}
              <ellipse cx="65" cy="38" rx="5" ry="6" fill="#374151" />
              {/* Tears */}
              <ellipse cx="35" cy="47" rx="3" ry="4" fill="#93C5FD" opacity="0.8" />
              <ellipse cx="65" cy="47" rx="3" ry="4" fill="#93C5FD" opacity="0.8" />
              {/* Sad mouth */}
              <path d="M 30 70 Q 50 58 70 70" fill="none" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Text content */}
        <div className="max-w-sm text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-orange-500">
            Nhà hàng không khả dụng
          </p>
          <h1 className="mb-4 text-3xl font-bold text-slate-800">
            {restaurant.restaurantName}
          </h1>
          <p className="mb-8 leading-relaxed text-slate-500">
            Nhà hàng này hiện đã tạm ngưng hoạt động và không nhận đơn hàng.
            Vui lòng quay lại sau hoặc khám phá các nhà hàng khác trên Scan2Order.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/restaurants"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-orange-500 hover:to-amber-500 hover:shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M2.879 7.121A3 3 0 007.5 6.196a3.001 3.001 0 002.634 1.55 3 3 0 002.571-1.446A3 3 0 0017.5 7.5a3 3 0 00.919-.141v6.891a2 2 0 01-2 2H3.581a2 2 0 01-2-2V7.359c.295.094.605.141.919.141a3 3 0 00.379-.021z" />
              </svg>
              Tìm nhà hàng khác
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-6H2a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
              </svg>
              Về trang chủ
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-16 text-xs text-slate-400">Powered by scan2order.io.vn</p>
      </div>
    );
  }

  // 5. Trả về View (Presentation)
  return <RestaurantDetailView restaurant={restaurant} />;
}

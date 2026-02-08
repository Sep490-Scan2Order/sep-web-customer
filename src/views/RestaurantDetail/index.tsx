import { MainLayout } from "@/layouts";
import { Restaurant } from "@/types";

interface RestaurantDetailViewProps {
  restaurant: Restaurant;
}

export default function RestaurantDetailView({ restaurant }: RestaurantDetailViewProps) {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-slate-600">
          Cuisine: {restaurant.cuisineType} | Rating: {restaurant.rating} |
          Distance: {restaurant.distance}
        </p>

        {/* Phần UI chi tiết (Menu, đánh giá...) bạn sẽ code tiếp ở đây
            mà không làm rối file logic bên app */}
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <p>Chi tiết thực đơn sẽ hiển thị ở đây...</p>
        </div>
      </div>
    </MainLayout>
  );
}

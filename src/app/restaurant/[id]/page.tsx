export const runtime = 'edge';
import { notFound } from "next/navigation";
import { getRestaurantById } from "@/services/restaurantService";
import RestaurantInfoView from "@/views/RestaurantInfo";

interface RestaurantPageProps {
  params: Promise<{ id: string }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  // 1. Xử lý Logic lấy tham số (Controller)
  const { id } = await params;

  // 2. Xử lý Logic lấy dữ liệu (Service)
  const restaurant = await getRestaurantById(id);

  // 3. Xử lý logic điều hướng
  if (!restaurant) {
    notFound();
  }

  // 4. Trả về View (Presentation) - Chỉ hiển thị thông tin nhà hàng
  return <RestaurantInfoView restaurant={restaurant} />;
}

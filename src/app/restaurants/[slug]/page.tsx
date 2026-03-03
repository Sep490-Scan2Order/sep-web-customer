import { notFound } from "next/navigation";
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

  // 4. Trả về View (Presentation)
  return <RestaurantDetailView restaurant={restaurant} />;
}

import { notFound } from "next/navigation";
import { getRestaurantById, getRestaurantBySlug } from "@/services/restaurantService";
import RestaurantDetailView from "@/views/RestaurantDetail";

interface MenuPageProps {
  searchParams: Promise<{ restaurant?: string; restaurantId?: string }>;
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const { restaurant, restaurantId } = await searchParams;
  const restaurantSlug = restaurant?.trim();
  const idFallback = restaurantId?.trim();

  if (!restaurantSlug && !idFallback) {
    notFound();
  }

  const restaurantData = restaurantSlug
    ? await getRestaurantBySlug(restaurantSlug)
    : await getRestaurantById(idFallback!);

  if (!restaurantData) {
    notFound();
  }

  return <RestaurantDetailView restaurant={restaurantData} initialMenuOpened menuOnly />;
}

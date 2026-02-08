import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";

/**
 * Lấy danh sách tất cả nhà hàng
 * Khi có Backend .NET: thay bằng api.get("/restaurants") và đổi NEXT_PUBLIC_API_URL trong .env
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  return mockRestaurants;
}

/**
 * Lấy chi tiết nhà hàng theo ID
 * Khi có Backend .NET: thay bằng api.get(`/restaurants/${id}`) và đổi NEXT_PUBLIC_API_URL trong .env
 */
export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  return mockRestaurants.find((r) => r.id === id) ?? null;
}

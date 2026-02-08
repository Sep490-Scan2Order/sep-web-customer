import { api } from "@/axios";
import type { Restaurant } from "@/types";

/**
 * Lấy danh sách tất cả nhà hàng
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  const { data } = await api.get<Restaurant[]>("/restaurants");
  return data;
}

/**
 * Lấy chi tiết nhà hàng theo ID
 * @returns Restaurant hoặc null nếu không tìm thấy
 */
export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  try {
    const { data } = await api.get<Restaurant>(`/restaurants/${id}`);
    return data;
  } catch {
    return null;
  }
}

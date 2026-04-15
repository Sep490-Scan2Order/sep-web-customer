

import { API, API_BASE_URL } from "@/services/api";
import { api } from "@/services/apiClient";
import { extractRestaurantPath } from "@/constants/routes";
import type {
  GetNearbyParams,
  NearbyRestaurantDto,
  PagedRestaurantResultDto,
  Restaurant,
  RestaurantDto,
  RestaurantSlugResponse,
  RestaurantSlugResponseData,
} from "@/types";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
};

// ==========================================
// CLIENT FETCH (Dùng Axios bình thường)
// ==========================================
export async function getNearbyRestaurants(
  params: GetNearbyParams
): Promise<Restaurant[]> {
  const { data } = await api.get<ApiResponse<NearbyRestaurantDto[]>>(
    API.RESTAURANT.GET_NEARBY,
    {
      params: {
        latitude: params.latitude,
        longitude: params.longitude,
        radiusKm: params.radiusKm ?? 5,
        limit: params.limit ?? 10,
      },
    }
  );
  return (data.data ?? []).map((d) => ({
    id: String(d.id),
    renderKey: `nearby-${d.id}`,
    name: d.restaurantName,
    image: d.image || "/placeholder-restaurant.jpg",
    rating: 0,
    cuisineType: d.description || "Nhà hàng",
    distance: `~ ${d.distanceKm.toFixed(2)} km`,
    address: d.address,
  }));
}

export function mapRestaurantSlugDataToCard(d: RestaurantSlugResponseData): Restaurant {
  const distance =
    d.distanceKm != null && !Number.isNaN(d.distanceKm)
      ? `~ ${d.distanceKm.toFixed(2)} km`
      : undefined;
  return {
    id: String(d.id),
    renderKey: `suggestion-${d.id}`,
    name: d.restaurantName,
    image: d.image || "/placeholder-restaurant.jpg",
    rating: 0,
    cuisineType: d.description || "Nhà hàng",
    ...(distance ? { distance } : {}),
    address: d.address,
  };
}

export async function getRestaurantSuggestions(): Promise<Restaurant[]> {
  const { data } = await api.get<ApiResponse<RestaurantSlugResponseData[]>>(
    API.RESTAURANT.GET_SUGGESTIONS
  );
  return (data.data ?? []).map((d) => mapRestaurantSlugDataToCard(d));
}

// ==========================================
// SERVER FETCH (Dùng Native Fetch cho Cloudflare Edge)
// ==========================================
export async function getRestaurantById(
  id: string
): Promise<RestaurantSlugResponseData | null> {
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return null;

  // Xử lý nối URL an toàn (tránh bị dư hoặc thiếu dấu gạch chéo /)
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = API.RESTAURANT.GET_BY_ID(numId).replace(/^\//, "");
  const url = `${base}/${path}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }

    const data: RestaurantSlugResponse = await response.json();
    if (data.isSuccess && data.data) return data.data;
    return null;
  } catch (err: unknown) {
    const message = (err as Error).message || "Lỗi không xác định khi gọi API.";
    throw new Error(`[getRestaurantById] ${message} (url=${url})`);
  }
}

export async function getRestaurantBySlug(
  slug: string
): Promise<RestaurantSlugResponseData | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;

  // Xử lý nối URL an toàn
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = API.RESTAURANT.GET_BY_SLUG(normalizedSlug).replace(/^\//, "");
  const url = `${base}/${path}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }

    const data: RestaurantSlugResponse = await response.json();
    if (data.isSuccess && data.data) {
      // Một số endpoint theo slug có thể thiếu openTime/closeTime.
      // Fallback: fetch thêm theo id và chỉ bổ sung các field còn thiếu.
      const hasOpenTime = Boolean(data.data.openTime?.trim());
      const hasCloseTime = Boolean(data.data.closeTime?.trim());
      if (hasOpenTime && hasCloseTime) return data.data;

      try {
        const fromId = await getRestaurantById(String(data.data.id));
        if (!fromId) return data.data;
        return {
          ...data.data,
          openTime: data.data.openTime ?? fromId.openTime ?? null,
          closeTime: data.data.closeTime ?? fromId.closeTime ?? null,
          minCashAmount: data.data.minCashAmount ?? fromId.minCashAmount ?? null,
        };
      } catch {
        return data.data;
      }
    }
    return null;
  } catch (err: unknown) {
    const message = (err as Error).message || "Lỗi không xác định khi gọi API.";
    throw new Error(`[getRestaurantBySlug] ${message} (url=${url})`);
  }
}

// ==========================================
// CLIENT FETCH (Dùng Axios bình thường)
// ==========================================
export async function getRestaurantsAll(
  page: number = 1,
  pageSize: number = 20,
  coords?: { latitude: number; longitude: number },
  keyword?: string
): Promise<PagedRestaurantResultDto> {
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;
  const normalizedKeyword = keyword?.trim();
  const { data } = await api.get<ApiResponse<PagedRestaurantResultDto>>(
    API.RESTAURANT.GET_ALL,
    {
      params: {
        page,
        pageSize,
        ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
        ...(normalizedKeyword ? { keyword: normalizedKeyword } : {}),
      },
    }
  );
  if (!data.data) {
    return {
      items: [],
      page: 1,
      pageSize,
      totalCount: 0,
      hasNextPage: false,
    };
  }
  return data.data;
}
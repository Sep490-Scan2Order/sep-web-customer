import { API } from "@/services/api";
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

export async function getRestaurantById(
  id: string
): Promise<RestaurantSlugResponseData | null> {
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return null;
  try {
    const { data } = await api.get<RestaurantSlugResponse>(
      API.RESTAURANT.GET_BY_ID(numId)
    );
    if (data.isSuccess && data.data) return data.data;
    return null;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function getRestaurantBySlug(
  slug: string
): Promise<RestaurantSlugResponseData | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;
  try {
    const { data } = await api.get<RestaurantSlugResponse>(
      API.RESTAURANT.GET_BY_SLUG(normalizedSlug)
    );
    if (data.isSuccess && data.data) return data.data;
    return null;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function getRestaurantsAll(
  latitude: number,
  longitude: number,
  page: number = 1,
  pageSize: number = 20
): Promise<PagedRestaurantResultDto> {
  const { data } = await api.get<ApiResponse<PagedRestaurantResultDto>>(
    API.RESTAURANT.GET_ALL,
    {
      params: { latitude, longitude, page, pageSize },
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

import { api } from "@/axios";
import { mockRestaurants } from "@/lib/mockData";
import type { Restaurant } from "@/types";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
};

export interface NearbyRestaurantDto {
  id: number;
  tenantId: string;
  restaurantName: string;
  address: string;
  longitude: number;
  latitude: number;
  image: string;
  phone: string | null;
  description: string | null;
  profileUrl: string | null;
  qrMenu: string | null;
  isActive: boolean;
  isOpened: boolean;
  isReceivingOrders: boolean;
  totalOrder: number;
  createdAt: string;
  distanceKm: number;
}

export interface GetNearbyParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

export async function getNearbyRestaurants(
  params: GetNearbyParams
): Promise<Restaurant[]> {
  const { data } = await api.get<ApiResponse<NearbyRestaurantDto[]>>(
    "api/restaurant/nearby",
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
    name: d.restaurantName,
    image: d.image || "/placeholder-restaurant.jpg",
    rating: 0,
    cuisineType: d.description || "Nhà hàng",
    distance: `~ ${d.distanceKm.toFixed(2)} km`,
    address: d.address,
  }));
}

export interface RestaurantDetailDto {
  id: number;
  tenantId: string;
  restaurantName: string;
  address: string;
  longitude: number;
  latitude: number;
  image: string;
  phone: string | null;
  description: string | null;
  profileUrl: string | null;
  qrMenu: string | null;
  isActive: boolean;
  isOpened: boolean;
  isReceivingOrders: boolean;
  totalOrder: number;
  createdAt: string;
  distanceKm?: number;
}

export async function getRestaurantById(
  id: string
): Promise<RestaurantDetailDto | null> {
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return null;
  try {
    const { data } = await api.get<ApiResponse<RestaurantDetailDto>>(
      `api/Restaurant/${numId}`
    );
    if (data.isSuccess && data.data) return data.data;
    return null;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export interface RestaurantDto {
  id: number;
  tenantId?: string;
  restaurantName: string;
  address: string;
  longitude?: number;
  latitude?: number;
  image: string;
  phone?: string | null;
  description?: string | null;
  profileUrl?: string | null;
  qrMenu?: string | null;
  isActive?: boolean;
  isOpened?: boolean;
  isReceivingOrders?: boolean;
  totalOrder?: number;
  createdAt?: string;
  distanceKm: number;
}

export interface PagedRestaurantResultDto {
  items: RestaurantDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
}

export async function getRestaurantsAll(
  latitude: number,
  longitude: number,
  page: number = 1,
  pageSize: number = 20
): Promise<PagedRestaurantResultDto> {
  const { data } = await api.get<ApiResponse<PagedRestaurantResultDto>>(
    "api/Restaurant/all",
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

export async function getRestaurants(): Promise<Restaurant[]> {
  return mockRestaurants;
}

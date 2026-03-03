/**
 * Restaurant interface for S2O (Scan2Order) platform
 */
export interface Restaurant {
  id: string;
  renderKey?: string;
  name: string;
  image: string;
  rating: number;
  cuisineType: string;
  distance: string;
  address?: string;
}

export interface RestaurantSlugResponseData {
  id: number;
  tenantId: string;
  restaurantName: string;
  address: string;
  longitude: number;
  latitude: number;
  image: string;
  phone: string | null;
  slug: string;
  description: string | null;
  profileUrl: string | null;
  qrMenu: string | null;
  isActive: boolean;
  isOpened: boolean;
  isReceivingOrders: boolean;
  totalOrder: number;
  createdAt: string;
  distanceKm: number | null;
}

export interface RestaurantSlugResponse {
  isSuccess: boolean;
  message: string;
  data: RestaurantSlugResponseData;
  errors: unknown;
  timestamp: string;
}

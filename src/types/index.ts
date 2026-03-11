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

export interface MenuRestaurantTemplateResponseData {
  restaurantId: number;
  menuTemplateId: number;
  restaurant: RestaurantSlugResponseData;
  menuTemplate: MenuTemplate;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}


export interface MenuTemplate {
  id: number;
  templateName: string;
  layoutConfigJson: string;
  themeColor: string;
  fontFamily: string;
  backgroundImageUrl: string;
}

export interface MenuRestaurantTemplateResponse {
  isSuccess: boolean;
  message: string;
  data: MenuRestaurantTemplateResponseData;
  errors: unknown;
  timestamp: string;
}

export interface MenuLayoutSlot {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataSource: string;
}

export interface MenuLayoutConfig {
  version: number;
  canvas?: {
    width?: number;
    height?: number;
    backgroundMode?: string;
    backgroundColor?: string;
    backgroundImageUrl?: string;
  };
  slots: MenuLayoutSlot[];
  dataMapping?: {
    categories?: {
      source?: string;
      displayField?: string;
    };
    dishes?: {
      source?: string;
      groupBy?: string;
      displayFields?: string[];
    };
  };
}

export interface GroupedMenuDish {
  dishId: number;
  dishName: string;
  categoryName: string;
  description: string;
  imageUrl: string;
  price: number;
  isSoldOut: boolean;
}

export interface GroupedMenuCategory {
  categoryId: number;
  categoryName: string;
  dishes: GroupedMenuDish[];
}

export interface GroupedMenuResponse {
  isSuccess: boolean;
  message: string;
  data: GroupedMenuCategory[];
  errors: unknown;
  timestamp: string;
}

export interface SendOtpResponse {
  isSuccess: boolean;
  message: string;
}

export interface RegisterPhoneResponse {
  isSuccess: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

export interface NearbyRestaurantDto {
  id: number;
  tenantId: string;
  restaurantName: string;
  slug?: string;
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

export interface RestaurantDto {
  id: number;
  tenantId?: string;
  restaurantName: string;
  slug?: string;
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

export interface MenuCategoryItem {
  id: string;
  name: string;
}

export interface MenuDishItem {
  id: string;
  name: string;
  price: number | null;
  description: string;
  categoryId: string;
  imageUrl?: string;
  isSoldOut?: boolean;
}

export interface RestaurantMenuSection {
  id: string;
  name: string;
  dishes: MenuDishItem[];
}

export interface RestaurantMenuData {
  sections: RestaurantMenuSection[];
  ungroupedDishes: MenuDishItem[];
}

export interface RestaurantMenuFromTemplateResult {
  menuData: RestaurantMenuData;
  templateData: MenuRestaurantTemplateResponseData | null;
}

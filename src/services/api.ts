export const API = {
    BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:7102/api",
    AUTH: {
        SEND_OTP: "/Auth/send-otp",
        REGISTER_PHONE: "/Auth/register-phone",
        REFRESH: "/Auth/refresh",
    },
    RESTAURANT: {
        GET_NEARBY: "/restaurant/nearby",
        GET_BY_ID: (id: number | string) => `/Restaurant/${id}`,
        GET_BY_SLUG: (slug: string) => `/Restaurant/${encodeURIComponent(slug)}`,
        GET_ALL: "/Restaurant/all",
        GET_MENU: (restaurantId: number | string) => `/Restaurant/${restaurantId}/menu`,
    },
    MENU_RESTAURANT: {
        GET_BY_RESTAURANT_ID: (restaurantId: number | string) =>
            `/MenuRestaurant/${restaurantId}`,
    },
    MENU: {
        GET_BY_RESTAURANT_ID: (restaurantId: number | string) =>
            `/Menu/restaurant/${restaurantId}`,
    },
    CATEGORY: {
        GET_ALL: "/Category",
        GET_ALL_LEGACY: "/Categories",
        GET_ALL_FALLBACK: "/Category/get-all",
        GET_BY_TENANT_ID: (tenantId: string) =>
            `/Category/get-category-by-tenantId/${tenantId}`,
    },
    DISH: {
        GET_ALL: "/Dish",
        GET_ALL_LEGACY: "/Dishes",
        GET_ALL_FALLBACK: "/Dishes/get-all",
        GET_BY_TENANT_ID: (tenantId: string) =>
            `/Dish/get-dish-by-tenantId/${tenantId}`,
        GET_BY_RESTAURANT_ID: (restaurantId: number | string) =>
            `/Dish/by-restaurant/${restaurantId}`,
    },
};
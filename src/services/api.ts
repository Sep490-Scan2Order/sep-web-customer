function getApiBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window === "undefined") {
        return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api`;
    }
    return "/api";
}

export const API_BASE_URL = getApiBaseUrl();

export const API = {
    AUTH: {
        SEND_OTP: "/Auth/send-otp",
        REGISTER_PHONE: "/Auth/register-phone",
        REFRESH: "/Auth/refresh",
    },
    ORDER: {
        CUSTOMER_GET_ORDERS_ACTIVE: "/Order/customer/orders/active",
        CUSTOMER_GET_ORDERS_ACTIVE_ALL: "/Order/customer/orders/active/all-restaurants",
        ADD_TO_CART: "/order/add-to-cart",
        CHECKOUT_CASH: "/order/checkout/cash",
        CHECKOUT_BANK_TRANSFER: "/order/checkout/bank-transfer",
    },
    RESTAURANT: {
        GET_NEARBY: "/Restaurant/nearby",
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
    SEARCH: {
        HYBRID: "/Search/hybrid",
    }
};

/**
 * Route constants and configuration for S2O
 */
export const ROUTES = {
  HOME: "/",
  HISTORY: "/history",
  PROFILE: "/profile",
  LOGIN: "/login",
  SIGNUP: "/register",
  VOUCHER: "/voucher",
  MY_VOUCHERS: "/my-vouchers",
  RESTAURANT: (id: string) => `/restaurant/${id}`,
  RESTAURANTS: "/restaurants",
} as const;

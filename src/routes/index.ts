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
  RESTAURANT: (id: string) => `/restaurant/${id}`,
} as const;

/**
 * Route constants and configuration for S2O
 */
export const ROUTES = {
  HOME: "/",
  HISTORY: "/history",
  PROFILE: "/profile",
  LOGIN: "/login",
  SIGNUP: "/register",
  VERIFY_OTP: "/verify-otp",
  RESTAURANT: (id: string) => `/restaurant/${id}`,
} as const;

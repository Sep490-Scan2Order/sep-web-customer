/**
 * Route constants and configuration for S2O
 */
export const ROUTES = {
  HOME: "/",
  HISTORY: "/history",
  PROFILE: "/profile",
  LOGIN: "/login",
  RESTAURANT: (id: string) => `/restaurant/${id}`,
} as const;

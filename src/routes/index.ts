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
  RESTAURANTS: "/restaurants",
  RESTAURANT: (id: string | number) => `/restaurant/${id}`,
  RESTAURANT_SLUG: (slug: string) => `/restaurants/${slug}`,
} as const;

/**
 * Extract relative path from profileUrl (e.g., "/restaurants/slug-123")
 */
export function extractRestaurantPath(profileUrl: string | null): string | null {
  if (!profileUrl) return null;
  try {
    const url = new URL(profileUrl);
    return url.pathname;
  } catch {
    // If not a valid URL, assume it is already a path
    return profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
  }
}

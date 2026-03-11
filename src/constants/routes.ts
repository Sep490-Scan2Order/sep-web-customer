/**
 * Route constants and configuration for S2O
 */
export const ROUTES = {
  HOME: "/",
  HISTORY: "/history",
  MENU: "/menu",
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
    return profileUrl.startsWith("/") ? profileUrl : `/${profileUrl}`;
  }
}

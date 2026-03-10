/**
 * Base URL for API - supports both client (relative) and server (absolute)
 */
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

import { API_BASE_URL } from "@/services/api";

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/**
 * API_BASE_URL thường là:
 * - client: "/api"
 * - server: "http://localhost:3000/api"
 * - env: "https://localhost:7102/api"
 *
 * Hub cần base URL (không có "/api").
 */
export function getSignalRHubUrl(): string {
  const base = stripTrailingSlash(API_BASE_URL);
  if (base.endsWith("/api")) return `${base.slice(0, -4)}/scan2order-hub`;
  return `${base}/scan2order-hub`;
}


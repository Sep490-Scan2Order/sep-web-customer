import axios from "axios";

/**
 * Base URL for API - supports both client (relative) and server (absolute)
 */
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Server-side cần URL tuyệt đối
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api`;
  }
  return "/api";
}

function getHttpsAgent(): import("https").Agent | undefined {
  if (typeof window !== "undefined") return undefined;
  const isDev = process.env.NODE_ENV === "development";
  const allowSelfSigned =
    process.env.NEXT_PUBLIC_ACCEPT_SELF_SIGNED === "true";
  if (isDev || allowSelfSigned) {
    const https = require("https");
    return new https.Agent({ rejectUnauthorized: false });
  }
  return undefined;
}

/**
 * Axios instance for API requests.
 * In development, server-side requests accept self-signed certificates (e.g. local HTTPS API).
 */
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  httpsAgent: getHttpsAgent(),
});

// Request interceptor: gửi kèm Authorization: Bearer <accessToken> (trừ khi _skipAuth)
api.interceptors.request.use(
  (config) => {
    if ((config as { _skipAuth?: boolean })._skipAuth) return config;
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("s2o_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: 401 → thử refresh token, thất bại thì clear và dispatch session-expired
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    if (error?.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }
    const isRefreshRequest =
      typeof originalRequest.url === "string" &&
      originalRequest.url.includes("Auth/refresh");
    if (isRefreshRequest || originalRequest._retried) {
      if (typeof window !== "undefined") {
        const { clearTokens, dispatchSessionExpired } = await import(
          "@/services/authService"
        );
        clearTokens();
        dispatchSessionExpired();
      }
      return Promise.reject(error);
    }
    try {
      const { refreshAccessToken, clearTokens, dispatchSessionExpired } =
        await import("@/services/authService");
      const result = await refreshAccessToken();
      if (!result) {
        if (typeof window !== "undefined") {
          clearTokens();
          dispatchSessionExpired();
        }
        return Promise.reject(error);
      }
      originalRequest._retried = true;
      originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
      return api(originalRequest);
    } catch {
      if (typeof window !== "undefined") {
        const { clearTokens, dispatchSessionExpired } = await import(
          "@/services/authService"
        );
        clearTokens();
        dispatchSessionExpired();
      }
      return Promise.reject(error);
    }
  }
);

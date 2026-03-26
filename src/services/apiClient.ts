import axios from "axios";
import { API_BASE_URL } from "@/services/api";

function getHttpsAgent(): import("https").Agent | undefined {
  if (typeof window !== "undefined") return undefined;
  
 // 1. SỬA LỖI EDGE: Dựa vào biến môi trường của Next.js
  if (process.env.NEXT_RUNTIME === "edge") {
    return undefined; 
  }

  const isDev = process.env.NODE_ENV === "development";
  const allowSelfSigned = process.env.NEXT_PUBLIC_ACCEPT_SELF_SIGNED === "true";
  
  if (isDev || allowSelfSigned) {
    try {
      // Dùng try-catch để nếu lỡ Edge có chạy vào đây thì cũng không bị crash web
      const https = require("https");
      return new https.Agent({ rejectUnauthorized: false });
    } catch (e) {
      // Bọc try-catch để an toàn 100% không làm sập server nếu thiếu thư viện
      return undefined;
    }
  }
  return undefined;
}

/**
 * Axios instance for API requests.
 * In development, server-side requests accept self-signed certificates (e.g. local HTTPS API).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  httpsAgent: getHttpsAgent(),
  
  //@ts-ignore: 
  fetch: (url, options) => fetch(url, options),
});

// ==========================================
// BÊN DƯỚI GIỮ NGUYÊN CODE CŨ CỦA BẠN
// Response interceptor...
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

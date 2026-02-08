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

/**
 * Axios instance for API requests
 */
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);

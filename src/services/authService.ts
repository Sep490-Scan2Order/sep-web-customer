import { api } from "@/services/apiClient";
import { API } from "@/services/api";
import type { RegisterPhoneResponse, SendOtpResponse } from "@/types";

const ACCESS_TOKEN_KEY = "s2o_access_token";
const REFRESH_TOKEN_KEY = "s2o_refresh_token";
const USER_INFO_KEY = "s2o_user_info";

export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "===".slice(0, (4 - (base64.length % 4)) % 4);
    const json = atob(base64 + padding);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

/**
 * Kiểm tra access token đã hết hạn chưa (có buffer 30s)
 */
export function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp < Math.floor(Date.now() / 1000) + bufferSeconds;
}

export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  const { data } = await api.post<SendOtpResponse>(
    API.AUTH.SEND_OTP,
    { phone },
    { _skipAuth: true } as Record<string, unknown>
  );
  return data;
}

export async function registerPhone(
  phone: string,
  password: string,
  otp: string
): Promise<RegisterPhoneResponse> {
  const { data } = await api.post<RegisterPhoneResponse>(
    API.AUTH.REGISTER_PHONE,
    { phone, password, otp },
    { _skipAuth: true } as Record<string, unknown>
  );
  return data;
}

/**
 * Lưu token sau đăng nhập (localStorage)
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Lấy access token (để gửi header Authorization)
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_INFO_KEY);
}

export function dispatchSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

/**
 * Gọi API refresh để lấy access token mới. Trả về null nếu thất bại.
 */
export async function refreshAccessToken(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await api.post(
      API.AUTH.REFRESH,
      { refreshToken },
      { _skipAuth: true } as Record<string, unknown>
    );
    const data = res.data as
      | { accessToken?: string; refreshToken?: string }
      | null
      | undefined;
    if (data?.accessToken) {
      setTokens(data.accessToken, data.refreshToken ?? refreshToken);
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? refreshToken,
      };
    }
    return null;
  } catch {
    return null;
  }
}

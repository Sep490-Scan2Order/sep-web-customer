import { api } from "@/axios";

const ACCESS_TOKEN_KEY = "s2o_access_token";
const REFRESH_TOKEN_KEY = "s2o_refresh_token";

export interface LoginPhoneResponse {
  isSuccess: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Đăng nhập bằng SĐT + mật khẩu. POST /api/Auth/login-phone
 */
export async function loginPhone(
  phone: string,
  password: string
): Promise<LoginPhoneResponse> {
  const { data } = await api.post<LoginPhoneResponse>("api/Auth/login-phone", {
    phone,
    password,
  });
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

/**
 * Xóa token khỏi localStorage (dùng trong logout)
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Đăng xuất: gọi POST /api/Auth/logout với Bearer token.
 * Dù API trả 200 hay lỗi (401, 500, mạng…), luôn xóa accessToken và refreshToken.
 * Caller cần redirect về /login sau khi gọi.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("api/Auth/logout");
  } catch {
    // Bỏ qua mọi lỗi – luôn xóa token và để caller redirect
  } finally {
    clearTokens();
  }
}

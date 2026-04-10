import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  api: {
    post: postMock,
  },
}));

import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearTokens,
  dispatchSessionExpired,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  refreshAccessToken,
  registerPhone,
  sendOtp,
  setTokens,
} from "@/services/authService";

function makeJwtWithExp(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const payload = btoa(JSON.stringify({ exp }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${header}.${payload}.signature`;
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("returns true for malformed token", () => {
    expect(isTokenExpired("invalid-token")).toBe(true);
  });

  it("checks token expiry using exp timestamp", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const validToken = makeJwtWithExp(1_700_000_100);
    const expiredToken = makeJwtWithExp(1_700_000_000);

    expect(isTokenExpired(validToken, 0)).toBe(false);
    expect(isTokenExpired(expiredToken, 1)).toBe(true);

    nowSpy.mockRestore();
  });

  it("stores and clears tokens in localStorage", () => {
    setTokens("access-1", "refresh-1");
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");

    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("dispatches session expired event", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);

    dispatchSessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
  });

  it("calls sendOtp and registerPhone with skip auth config", async () => {
    postMock
      .mockResolvedValueOnce({ data: { isSuccess: true, message: "otp-sent" } })
      .mockResolvedValueOnce({
        data: {
          isSuccess: true,
          message: "registered",
          data: { accessToken: "a", refreshToken: "r" },
        },
      });

    const otp = await sendOtp("0900000001");
    const register = await registerPhone("0900000001", "pwd", "123456");

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      "/Auth/send-otp",
      { phone: "0900000001" },
      { _skipAuth: true }
    );
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      "/Auth/register-phone",
      { phone: "0900000001", password: "pwd", otp: "123456" },
      { _skipAuth: true }
    );
    expect(otp.isSuccess).toBe(true);
    expect(register.isSuccess).toBe(true);
  });

  it("refreshAccessToken returns null when refresh token is missing", async () => {
    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("refreshAccessToken updates localStorage and returns new tokens", async () => {
    window.localStorage.setItem("s2o_refresh_token", "old-refresh");
    postMock.mockResolvedValueOnce({
      data: {
        accessToken: "new-access",
        refreshToken: "new-refresh",
      },
    });

    const result = await refreshAccessToken();

    expect(postMock).toHaveBeenCalledWith(
      "/Auth/refresh",
      { refreshToken: "old-refresh" },
      { _skipAuth: true }
    );
    expect(result).toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
    expect(window.localStorage.getItem("s2o_access_token")).toBe("new-access");
    expect(window.localStorage.getItem("s2o_refresh_token")).toBe("new-refresh");
  });

  it("refreshAccessToken returns null on API error", async () => {
    window.localStorage.setItem("s2o_refresh_token", "old-refresh");
    postMock.mockRejectedValueOnce(new Error("network"));

    await expect(refreshAccessToken()).resolves.toBeNull();
  });
});
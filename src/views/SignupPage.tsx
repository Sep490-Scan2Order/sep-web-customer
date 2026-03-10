"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, Lock, Phone } from "lucide-react";
import { registerPhone, sendOtp, setTokens } from "@/services";
import { ROUTES } from "@/constants/routes";

type SignupStep = "phone" | "verify";

export function SignupPage() {
  const [step, setStep] = useState<SignupStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parseApiError = (err: unknown, fallback: string): string => {
    if (err && typeof err === "object" && "response" in err) {
      const data = (err as { response?: { data?: unknown } }).response?.data;
      if (typeof data === "string") return data;
      if (data && typeof data === "object" && "message" in data) {
        return (data as { message: string }).message;
      }
    }
    return fallback;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await sendOtp(phone.trim());
      if (!res.isSuccess) {
        setError(res.message || "Không thể gửi OTP.");
        return;
      }
      setSuccessMessage(res.message || "Đã gửi OTP đến số điện thoại của bạn.");
      setStep("verify");
    } catch (err: unknown) {
      setError(parseApiError(err, "Không thể gửi OTP. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await registerPhone(phone.trim(), password, otp.trim());
      if (!res.isSuccess) {
        setError(res.message || "Đăng ký thất bại.");
        return;
      }

      if (res.data?.accessToken) {
        setTokens(res.data.accessToken, res.data.refreshToken ?? "");
      }

      window.location.href = ROUTES.HOME;
    } catch (err: unknown) {
      setError(parseApiError(err, "Đăng ký thất bại. Vui lòng kiểm tra lại OTP."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#F6F3EC] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-xl shadow-emerald-900/10">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">Đăng ký</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          {step === "phone" ? "Nhập số điện thoại để nhận OTP" : "Nhập OTP và mật khẩu để hoàn tất"}
        </p>

        {(error || successMessage) && (
          <p
            className={`mt-4 rounded-xl px-4 py-2 text-sm ${
              error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || successMessage}
          </p>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <label htmlFor="signup-phone" className="block text-sm font-medium text-slate-800">
              Số điện thoại
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <input
                id="signup-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Đang gửi OTP..." : "Gửi OTP"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              Số điện thoại: <span className="font-semibold">{phone}</span>
            </div>

            <div>
              <label htmlFor="signup-otp" className="block text-sm font-medium text-slate-800">
                OTP
              </label>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                <input
                  id="signup-otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Nhập mã OTP"
                  className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-800">
                Mật khẩu
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tạo mật khẩu"
                  className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="flex flex-1 items-center justify-center gap-1 rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Đang đăng ký..." : "Hoàn tất"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-600">
          Đã đăng ký? Vui lòng liên hệ nhà hàng để đặt món.
        </p>
      </div>
    </div>
  );
}

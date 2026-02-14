"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone, Lock, ArrowRight } from "lucide-react";
import logoDefault from "@/assets/images/logo/logo_default.png";
import { loginPhone, setTokens } from "@/services";
import { ROUTES } from "@/routes";

export function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginPhone(phone, password);
      if (res.isSuccess && res.data?.accessToken) {
        setTokens(res.data.accessToken, res.data.refreshToken ?? "");
        window.location.href = ROUTES.HOME;
        return;
      }
      setError(res.message ?? "Đăng nhập thất bại.");
    } catch (err: unknown) {
      let msg: string | null = null;
      if (err && typeof err === "object" && "response" in err) {
        const data = (err as { response?: { data?: unknown } }).response?.data;
        if (typeof data === "string") msg = data;
        else if (data && typeof data === "object" && "message" in data)
          msg = (data as { message: string }).message;
      }
      setError(msg ?? "Đăng nhập thất bại. Kiểm tra lại SĐT và mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#F6F3EC] px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-xl shadow-emerald-900/10">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src={logoDefault}
              alt="Scan2Order"
              width={260}
              height={110}
              className="h-20 w-auto object-contain sm:h-24"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Đăng nhập
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="rounded-full bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-slate-800"
            >
              Số điện thoại
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                +84
              </span>
              <Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 912 345 678"
                className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-12 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-800"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-sm text-slate-600">
            Chưa có tài khoản?{" "}
            <Link href={ROUTES.SIGNUP} className="font-semibold text-emerald-600 hover:underline">
              Đăng ký
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

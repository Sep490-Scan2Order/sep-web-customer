"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import logoDefault from "@/assets/images/logo/logo_default.png";

export function VerifyOtpPage() {
  const [otp, setOtp] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: tích hợp logic xác thực OTP
    console.log("Verify OTP:", otp);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#F6F3EC] px-4 py-10 sm:px-6 lg:px-8">
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
            Xác thực OTP
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-slate-800"
            >
              Mã OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={handleChange}
              placeholder="••••••"
              className="tracking-[0.6em] text-center text-lg font-semibold w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            />
            <p className="text-xs text-slate-500">
              Không nhận được mã? Vui lòng kiểm tra lại số điện thoại hoặc yêu
              cầu gửi lại.
            </p>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
          >
            Xác nhận
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}


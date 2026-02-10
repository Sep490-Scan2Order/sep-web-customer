"use client";

import { useState } from "react";
import Image from "next/image";
import { Phone, ArrowRight } from "lucide-react";
import logoDefault from "@/assets/images/logo/logo_default.png";

export function LoginPage() {
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: tích hợp logic gửi OTP / đăng nhập
    console.log("Login with phone:", phone);
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
            Đăng nhập
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
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
            <p className="text-xs text-slate-500">
              Chúng tôi có thể gửi mã xác thực (OTP) về số điện thoại này.
            </p>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}


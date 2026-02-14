"use client";

import { useState } from "react";
import { User, Calendar, ArrowRight } from "lucide-react";

export function ProfilePage() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: gọi API lưu profile
    console.log("Save profile:", { name, dob });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-[#F6F3EC] px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-left">
          Thông tin cá nhân
        </h1>

        <section className="rounded-3xl bg-white/95 p-6 shadow-xl shadow-emerald-900/10 sm:p-8">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-800"
              >
                Họ và tên
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="dob"
                className="block text-sm font-medium text-slate-800"
              >
                Ngày sinh
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-full border border-emerald-200 bg-emerald-50/40 py-3 pl-11 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
            >
              Lưu thay đổi
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, Facebook, Instagram } from "lucide-react";
import logoDefault from "@/assets/images/logo/logo_default.png";

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
    setEmail("");
  };

  return (
    <footer className={`border-t bg-white px-6 py-10 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="#" className="flex items-center">
              <div className="flex h-16 w-[140px] items-center">
                <Image
                  src={logoDefault}
                  alt="Logo"
                  width={140}
                  height={64}
                  className="object-contain"
                />
              </div>
            </Link>

            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-medium">Cần giúp đỡ:</p>
              <p>
                <span className="font-medium">Gọi chúng tôi: </span>
                <span className="font-semibold text-red-500">000 000 0000</span>
              </p>
              <p>Long Thạnh Mỹ, TP.Thủ Đức, TP.Hồ Chí Minh</p>
              <p>hexaplanner@gmail.com</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-800">Công ty</h3>
            <div className="space-y-2">
              <Link
                href="#"
                className="block text-sm text-gray-600 transition-colors hover:text-[rgb(var(--color-accent-dark))]"
              >
                Về chúng tôi
              </Link>
              <Link
                href="#"
                className="block text-sm text-gray-600 transition-colors hover:text-[rgb(var(--color-accent-dark))]"
              >
                Liên hệ chúng tôi
              </Link>
              <Link
                href="#"
                className="block text-sm text-gray-600 transition-colors hover:text-[rgb(var(--color-accent-dark))]"
              >
                Hướng dẫn sử dụng
              </Link>
              <Link
                href="#"
                className="block text-sm text-gray-600 transition-colors hover:text-[rgb(var(--color-accent-dark))]"
              >
                Chính sách dữ liệu
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-800">
              Nhà Hàng Nổi Bật
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                "Phú Quốc",
                "Hội An",
                "Phan Thiết",
                "Hà Nội",
                "Đà Lạt",
                "Hồ Chí Minh",
                "Nha Trang",
                "Sa Pa",
              ].map((place) => (
                <Link
                  key={place}
                  href="#"
                  className="text-sm text-gray-600 transition-colors hover:text-[rgb(var(--color-accent-dark))]"
                >
                  {place}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-800">
              Đăng ký nhận thông tin mới nhất
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập Email"
                  className="w-full rounded-full border border-[rgb(var(--color-primary)/0.2)] bg-[rgb(var(--color-secondary))] px-4 py-2.5 text-sm placeholder-[rgb(var(--color-accent-dark))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))]"
                  required
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--color-accent))] p-2 text-white transition-colors hover:bg-[rgb(var(--color-accent-dark))]"
                  aria-label="Gửi"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="mt-4 flex space-x-3">
              <Link
                href="https://www.facebook.com/profile.php?id=61580875525961"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white transition-colors hover:bg-pink-600"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white transition-colors hover:bg-indigo-600"
              >
                <span className="text-xs font-bold">D</span>
              </Link>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500">
                2025 Scan2Order All Right Reserved
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };

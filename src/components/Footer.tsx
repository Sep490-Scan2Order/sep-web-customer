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
    // Handle email submission
    console.log("Email submitted:", email);
    setEmail("");
  };

  return (
    <footer className={`bg-white border-t px-6 py-10 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Contact Info */}
          <div className="space-y-4">
            <Link href="#" className="flex items-center">
              <div className="h-16 w-[140px] flex items-center">
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
                <span className="text-red-500 font-semibold">
                  000 000 0000
                </span>
              </p>
              <p>Long Thạnh Mỹ, TP.Thủ Đức, TP.Hồ Chí Minh</p>
              <p>hexaplanner@gmail.com</p>
            </div>
          </div>

          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 text-base">
              Công ty
            </h3>
            <div className="space-y-2">
              <Link
                href="#"
                className="block text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Về chúng tôi
              </Link>
              <Link
                href="#"
                className="block text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Liên hệ chúng tôi
              </Link>
              <Link
                href="#"
                className="block text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Hướng dẫn sử dụng
              </Link>
              <Link
                href="#"
                className="block text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Chính sách dữ liệu
              </Link>
            </div>
          </div>

          {/* Popular Destinations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 text-base">
              Nhà Hàng Nổi Bật
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6">
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Phú Quốc
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Hội An
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Phan Thiết
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Hà Nội
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Đà Lạt
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Hồ Chí Minh
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Nha Trang
              </Link>
              <Link
                href="#"
                className="text-sm text-gray-600 hover:text-[rgb(var(--color-accent-dark))] transition-colors"
              >
                Sa pa
              </Link>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800 text-sm">
              Đăng ký nhận thông tin mới nhất
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập Email"
                  className="w-full px-4 py-2.5 bg-[rgb(var(--color-secondary))] border border-[rgb(var(--color-primary)/0.2)] rounded-full text-sm placeholder-[rgb(var(--color-accent-dark))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))] focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[rgb(var(--color-accent))] text-white p-2 rounded-full hover:bg-[rgb(var(--color-accent-dark))] transition-colors"
                  aria-label="Gửi"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Social Icons */}
            <div className="flex space-x-3 mt-4">
              <Link
                href="https://www.facebook.com/profile.php?id=61580875525961"
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 transition-colors"
              >
                <span className="font-bold text-xs">D</span>
              </Link>
            </div>

            {/* Copyright */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 font-bold">
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
export default Footer;

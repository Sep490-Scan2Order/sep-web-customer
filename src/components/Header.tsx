"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, User, Gift, Ticket, LogIn, LogOut } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/routes";
import {
  getAccessToken,
  logout,
  isTokenExpired,
  refreshAccessToken,
  clearTokens,
  AUTH_SESSION_EXPIRED_EVENT,
} from "@/services";
import logoDefault from "@/assets/images/logo/logo_removebg.png";

const menuItems = [
  { href: ROUTES.PROFILE, label: "Thông tin cá nhân", icon: User },
  { href: ROUTES.VOUCHER, label: "Điểm voucher", icon: Gift },
  { href: ROUTES.MY_VOUCHERS, label: "Voucher của tôi", icon: Ticket },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function checkAuth() {
      const token = getAccessToken();
      if (!token) {
        setIsLoggedIn(false);
        return;
      }
      if (!isTokenExpired(token)) {
        setIsLoggedIn(true);
        return;
      }
      refreshAccessToken().then((result) => {
        setIsLoggedIn(!!result);
        if (!result) clearTokens();
      });
    }
    checkAuth();

    const onSessionExpired = () => setIsLoggedIn(false);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    return () =>
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    setIsLoggedIn(false);
    router.push(ROUTES.LOGIN);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-800/60 bg-emerald-700/95 text-white backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 font-bold text-emerald-50 transition-colors hover:text-white"
        >
          <div className="flex items-center overflow-visible">
            <Image
              src={logoDefault}
              alt={APP_NAME}
              width={220}
              height={96}
              className="h-14 w-auto origin-left scale-125 object-contain sm:h-16 sm:scale-150 lg:h-20"
              priority
            />
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <Link
              href={ROUTES.LOGIN}
              className="flex items-center gap-2 rounded-full border border-emerald-100/60 bg-emerald-600/40 px-4 py-2 text-sm font-semibold text-emerald-50 shadow-sm transition-colors hover:bg-emerald-500"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100/60 bg-emerald-600/40 text-emerald-50 transition-colors hover:bg-emerald-500"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-emerald-200 bg-white py-2 shadow-xl">
                  {menuItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Icon className="h-4 w-4 text-emerald-600" />
                      {label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-slate-200" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { APP_NAME } from "@/constants";
import { ROUTES } from "@/constants/routes";
import logoDefault from "@/assets/images/logo/logo_removebg.png";

const HEADER_LINKS = [
  { label: "Về chúng tôi", href: "/about-us" },
  { label: "Chính sách và bảo mật", href: "/privacy-policy" },
  { label: "Partnership", href: "/partnership" },
];

export function Header() {
  const [open, setOpen] = useState(false);

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

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-600/80 text-emerald-50 shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-emerald-700"
            aria-label="Mở menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>

          {open && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-emerald-100/80 bg-emerald-50/98 py-2 text-sm text-slate-800 shadow-xl backdrop-blur-md">
              {HEADER_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-2 text-slate-800 transition hover:bg-emerald-100 hover:text-emerald-900"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

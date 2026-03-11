"use client";

import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/constants";
import { ROUTES } from "@/constants/routes";
import logoDefault from "@/assets/images/logo/logo_removebg.png";

const HEADER_LINKS = [
  { label: "Về chúng tôi", href: "/about-us" },
  { label: "Chính sách và bảo mật", href: "/privacy-policy" },
  { label: "Partnership", href: "/partnership" },
];

export function Header() {
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

        <nav className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6">
          {HEADER_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-emerald-50/90 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

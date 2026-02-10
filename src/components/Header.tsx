"use client";

import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/routes";
import logoDefault from "@/assets/images/logo/logo_removebg.png";

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

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.LOGIN}
            className="flex items-center gap-2 rounded-full border border-emerald-100/60 bg-emerald-600/40 px-4 py-2 text-sm font-semibold text-emerald-50 shadow-sm transition-colors hover:bg-emerald-500"
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </Link>
        </div>
      </div>
    </header>
  );
}

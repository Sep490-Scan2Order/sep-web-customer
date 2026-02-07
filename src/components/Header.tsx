"use client";

import Link from "next/link";
import { UtensilsCrossed, LogIn, Home, History, User } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { ROUTES } from "@/routes";

const navLinks = [
  { href: ROUTES.HOME, label: "Home", icon: Home },
  { href: ROUTES.HISTORY, label: "History", icon: History },
  { href: ROUTES.PROFILE, label: "Profile", icon: User },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 font-bold text-emerald-600 transition-colors hover:text-emerald-700"
        >
          <UtensilsCrossed className="h-7 w-7" />
          <span className="text-xl">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href={ROUTES.LOGIN}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <LogIn className="h-4 w-4" />
          Login
        </Link>
      </div>
    </header>
  );
}

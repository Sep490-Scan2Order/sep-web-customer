"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShoppingCart } from "lucide-react";
import { APP_NAME } from "@/constants";
import { ROUTES } from "@/constants/routes";
import logoDefault from "@/assets/images/logo/logo_removebg.png";
import { loadCartCache } from "@/services/orderCustomerService";
import { AllRestaurantsOrderLookupDrawer } from "@/components/ui/common/AllRestaurantsOrderLookupDrawer";

const HEADER_LINKS = [
  { label: "Về chúng tôi", href: "/about-us" },
  { label: "Chính sách và bảo mật", href: "/privacy-policy" },
  { label: "Partnership", href: "/partnership" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderLookupOpen, setOrderLookupOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartId, setCartId] = useState<string | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const restaurantIdFromPath = useMemo(() => {
    if (!pathname) return null;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "restaurant") return null;
    return parts[1] || null;
  }, [pathname]);

  useEffect(() => {
    if (!restaurantIdFromPath || typeof window === "undefined") {
      setCartCount(0);
      setCartId(null);
      return;
    }

    const syncCart = () => {
      try {
        const parsed = loadCartCache(restaurantIdFromPath);
        if (!parsed) {
          setCartId(null);
          setCartCount(0);
          return;
        }
        setCartId(parsed.cartId);
        const count =
          parsed.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) ?? 0;
        setCartCount(count);
      } catch {
        setCartId(null);
        setCartCount(0);
      }
    };

    syncCart();
    const onStorage = () => syncCart();
    const onCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ restaurantId?: string | number }>).detail;
      if (!detail?.restaurantId) return;
      if (String(detail.restaurantId) !== String(restaurantIdFromPath)) return;
      syncCart();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("s2o-cart-updated", onCartUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("s2o-cart-updated", onCartUpdated as EventListener);
    };
  }, [restaurantIdFromPath]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = headerMenuRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  return (
    <>
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

        <div ref={headerMenuRef} className="relative flex items-center gap-2">
          {restaurantIdFromPath && (
            <button
              type="button"
              onClick={() => {
                if (!cartId) return;
                router.push(
                  `/checkout-preorder?cartId=${encodeURIComponent(
                    cartId
                  )}&restaurantId=${encodeURIComponent(restaurantIdFromPath)}`
                );
              }}
              disabled={!cartId}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-600/80 text-emerald-50 shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Mở giỏ hàng"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-emerald-700">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-600/80 text-emerald-50 shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-emerald-700"
              aria-label="Mở menu"
              aria-expanded={open}
              aria-haspopup="true"
            >
              <Menu className="h-5 w-5" />
            </button>

            {open && (
              <div
                className="absolute right-0 top-full z-[60] mt-2 w-56 origin-top-right rounded-2xl border border-emerald-100/80 bg-emerald-50/98 py-2 text-sm text-slate-800 shadow-xl backdrop-blur-md"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOrderLookupOpen(true);
                    setOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-slate-800 transition hover:bg-emerald-100 hover:text-emerald-900"
                >
                  Tra cứu hóa đơn
                </button>
                {HEADER_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    role="menuitem"
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
      </div>
    </header>
    <AllRestaurantsOrderLookupDrawer
      open={orderLookupOpen}
      onClose={() => setOrderLookupOpen(false)}
    />
    </>
  );
}

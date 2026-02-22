"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes";
import { FALLBACK_RESTAURANT_IMAGE } from "@/lib/constants";

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

export function RestaurantCard({ restaurant, className }: RestaurantCardProps) {
  const [imgSrc, setImgSrc] = useState(restaurant.image);

  useEffect(() => {
    setImgSrc(restaurant.image);
  }, [restaurant.image]);

  return (
    <Link
      href={ROUTES.RESTAURANT(restaurant.id)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        "border border-slate-100",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={restaurant.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgSrc(FALLBACK_RESTAURANT_IMAGE)}
        />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-slate-900 transition-colors group-hover:text-emerald-600">
          {restaurant.name}
        </h3>
        <span className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {restaurant.distance}
        </span>
      </div>
    </Link>
  );
}

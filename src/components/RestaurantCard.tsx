import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { Restaurant } from "@/types";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes";

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
}

export function RestaurantCard({ restaurant, className }: RestaurantCardProps) {
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
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 backdrop-blur-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          <span className="text-sm font-semibold text-slate-800">
            {restaurant.rating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-slate-900 transition-colors group-hover:text-emerald-600">
          {restaurant.name}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700">
            {restaurant.cuisineType}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {restaurant.distance}
          </span>
        </div>
      </div>
    </Link>
  );
}

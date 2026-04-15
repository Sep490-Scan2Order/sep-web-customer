"use client";

import { useEffect, useState } from "react";
import { RestaurantCard } from "./RestaurantCard";
import { getRestaurantSuggestions } from "@/services/restaurantService";
import type { Restaurant } from "@/types";

type Status = "loading" | "success" | "error";

export function SuggestedRestaurantGrid() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    getRestaurantSuggestions()
      .then((data) => {
        if (cancelled) return;
        setRestaurants(data);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Không tải được nhà hàng đề xuất.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl bg-slate-200"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-amber-800">{error}</div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <p className="rounded-xl bg-slate-100 p-4 text-slate-600">
        Hiện chưa có nhà hàng đề xuất.
      </p>
    );
  }

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        className="scrollbar-hide flex gap-4 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {restaurants.map((restaurant) => (
          <div
            key={restaurant.renderKey ?? restaurant.id}
            className="w-[85vw] shrink-0 sm:w-72 md:w-80"
            style={{ scrollSnapAlign: "start" }}
          >
            <RestaurantCard restaurant={restaurant} />
          </div>
        ))}
      </div>
    </div>
  );
}

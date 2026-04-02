"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RestaurantCard } from "./RestaurantCard";
import { getRestaurantsAll } from "@/services/restaurantService";
import type { Restaurant, RestaurantDto } from "@/types";

const PAGE_SIZE = 20;

type Status = "loading" | "success" | "empty" | "error";

function dtoToRestaurant(d: RestaurantDto, withDistance: boolean): Restaurant {
  const distanceKm = Number.isFinite(d.distanceKm) ? d.distanceKm : null;
  return {
    id: String(d.id),
    renderKey: `all-${d.id}`,
    name: d.restaurantName,
    image: d.image || "/placeholder-restaurant.jpg",
    rating: 0,
    cuisineType: d.description || "Nhà hàng",
    distance: withDistance && distanceKm != null ? `~ ${distanceKm.toFixed(2)} km` : undefined,
    address: d.address,
  };
}

interface AllRestaurantsListProps {
  keyword?: string | null;
}

export function AllRestaurantsList({ keyword }: AllRestaurantsListProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean, c: { latitude: number; longitude: number } | null, k?: string | null) => {
      if (pageNum === 1) {
        setStatus("loading");
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await getRestaurantsAll(pageNum, PAGE_SIZE, c ?? undefined, k ?? undefined);
        const mapped = result.items.map((x) => dtoToRestaurant(x, c != null));

        setRestaurants((prev) => (append ? [...prev, ...mapped] : mapped));
        nextPageRef.current = result.page + 1;
        setHasNextPage(result.hasNextPage);
        setStatus(mapped.length > 0 ? "success" : "empty");
      } catch (err: unknown) {
        if (pageNum === 1) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (err as { message?: string })?.message ||
            "Không tải được danh sách nhà hàng.";
          setError(msg);
          setStatus("error");
        }
      } finally {
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    const load = (c: { latitude: number; longitude: number } | null) => {
      if (cancelled) return;
      setCoords(c);
      fetchPage(1, false, c, keyword);
    };

    if (!navigator?.geolocation) {
      load(null);
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        load({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        load(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    return () => {
      cancelled = true;
    };
  }, [fetchPage, keyword]);

  useEffect(() => {
    if (!hasNextPage || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        fetchPage(nextPageRef.current, true, coords, keyword);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, loadingMore, fetchPage, coords, keyword]);

  if (status === "loading" && restaurants.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-hidden />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-amber-800">
        {error ?? "Đã có lỗi xảy ra khi tải danh sách."}
      </div>
    );
  }

  if (status === "empty" || restaurants.length === 0) {
    return (
      <p className="rounded-xl bg-slate-100 p-4 text-slate-600">Không có nhà hàng nào.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.renderKey ?? restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden />

      {loadingMore && (
        <div className="mt-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
        </div>
      )}
    </>
  );
}


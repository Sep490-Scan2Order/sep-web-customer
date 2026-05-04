"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, MapPin, Utensils } from "lucide-react";
import {
  hybridSearch,
  type HybridSearchParams,
} from "@/services/hybridSearchService";
import type { HybridSearchResult, HybridSearchDish } from "@/types";

const DEBOUNCE_DELAY_MS = 500;

type Status = "loading" | "success" | "empty" | "error";

interface HybridSearchResultsProps {
  keyword: string;
}

export function HybridSearchResults({ keyword }: HybridSearchResultsProps) {
  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get user coordinates
  useEffect(() => {
    let cancelled = false;

    if (!navigator?.geolocation) {
      if (!cancelled) {
        setCoords(null);
      }
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      },
      () => {
        if (!cancelled) {
          setCoords(null);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // Perform search
  useEffect(() => {
    if (!keyword || keyword.trim() === "") {
      setStatus("empty");
      setResults([]);
      return;
    }

    setStatus("loading");
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const searchParams: HybridSearchParams = {
          keyword,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          radiusKm: 20,
          topK: 20,
        };

        const data = await hybridSearch(searchParams);

        if (!data || data.length === 0) {
          setStatus("empty");
        } else {
          setResults(data);
          setStatus("success");
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          (err as { message?: string })?.message ||
          "Không tải được kết quả tìm kiếm.";
        setError(msg);
        setStatus("error");
      }
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [keyword, coords]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl bg-slate-200"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-800">
        <p className="font-medium">Lỗi tìm kiếm</p>
        <p className="text-sm">{error ?? "Đã có lỗi xảy ra khi tìm kiếm."}</p>
      </div>
    );
  }

  if (status === "empty" || results.length === 0) {
    return (
      <div className="rounded-xl bg-slate-100 p-8 text-center">
        <Utensils className="mx-auto mb-4 h-12 w-12 text-slate-400" />
        <p className="text-lg font-medium text-slate-600">
          Không tìm thấy kết quả
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Hãy thử tìm kiếm với từ khóa khác
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results.map((result) => (
        <RestaurantSearchResult key={result.restaurantId} result={result} />
      ))}
    </div>
  );
}

interface RestaurantSearchResultProps {
  result: HybridSearchResult;
}

function RestaurantSearchResult({ result }: RestaurantSearchResultProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg">
      {/* Restaurant Header */}
      <div className="relative">
        <div className="h-40 overflow-hidden bg-gradient-to-b from-slate-200 to-slate-100">
          {result.backgroundImageUrl && (
            <img
              src={
                "https://i.pinimg.com/736x/59/f3/2b/59f32b1825a6113a7ebe92057c2338d7.jpg"
              }
              alt={result.restaurantName}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 bg-gradient-to-t from-black/40 to-transparent px-4 pb-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 border-white shadow-lg">
            <img
              src={
                result.imageUrl ||
                "https://ysafyqmiutvhohvsthnt.supabase.co/storage/v1/object/public/logo/logo_default.png"
              }
              alt={result.restaurantName}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex-1 pb-1">
            <Link
              href={`/restaurant/${result.restaurantId}`}
              className="text-lg font-bold text-white hover:underline"
            >
              {result.restaurantName}
            </Link>
          </div>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-4 text-sm">
          {result.gpsDistanceKm != null && result.gpsDistanceKm < 1000 && (
            <div className="flex items-center gap-1 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span>~ {result.gpsDistanceKm.toFixed(2)} km</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-slate-600">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{(result.finalScore * 100).toFixed(0)}%</span>
          </div>
        </div>

        {result.description && (
          <p className="mb-3 line-clamp-2 text-sm text-slate-600">
            {result.description}
          </p>
        )}
      </div>

      {/* Suggested Dishes */}
      {result.suggestedDishes && result.suggestedDishes.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Gợi ý cho bạn ({result.suggestedDishes.length} món)
            </h4>
            <div className="space-y-2">
              {result.suggestedDishes.map((dish) => (
                <DishItem key={dish.dishId} dish={dish} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Menu Button */}
      <div className="border-t border-slate-100 px-4 py-3">
        <Link
          href={`/restaurant/${result.restaurantId}`}
          className="block w-full rounded-lg bg-slate-900 py-2 text-center font-medium text-white transition-colors hover:bg-slate-800"
        >
          Xem thực đơn
        </Link>
      </div>
    </div>
  );
}

interface DishItemProps {
  dish: HybridSearchDish;
}

function DishItem({ dish }: DishItemProps) {
  return (
    <div className="flex gap-3 rounded-lg bg-slate-50 p-2">
      {dish.imageUrl && (
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={dish.imageUrl}
            alt={dish.dishName}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{dish.dishName}</p>
        <p className="line-clamp-1 text-xs text-slate-500">
          {dish.description}
        </p>
        <p className="mt-1 text-sm font-semibold text-emerald-600">
          {dish.price.toLocaleString("vi-VN")} ₫
        </p>
      </div>
    </div>
  );
}

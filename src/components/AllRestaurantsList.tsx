"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import {
  getRestaurantsAll,
  type RestaurantDto,
} from "@/services/restaurantService";
import type { Restaurant } from "@/types";

const PAGE_SIZE = 20;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const POSITION_CACHE_KEY = "s2o_last_position";
const POSITION_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

type Status = "loading" | "success" | "empty" | "error";

interface CachedPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

function getCachedPosition(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(POSITION_CACHE_KEY);
    if (!raw) return null;
    const data: CachedPosition = JSON.parse(raw);
    if (Date.now() - data.timestamp > POSITION_CACHE_MAX_AGE_MS) return null;
    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

function setCachedPosition(lat: number, lng: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      POSITION_CACHE_KEY,
      JSON.stringify({ lat, lng, timestamp: Date.now() })
    );
  } catch {
    // ignore
  }
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  const res = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`,
    { headers: { "Accept-Language": "vi" } }
  );
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  };
}

function getRestaurantId(dto: { profileUrl?: string | null; slug?: string; id: number }): string {
  if (dto.profileUrl) {
    try {
      const path = new URL(dto.profileUrl).pathname;
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) return segments[segments.length - 1];
    } catch {
      // Invalid URL, fallback
    }
  }
  return dto.slug || String(dto.id);
}

function dtoToRestaurant(d: RestaurantDto): Restaurant {
  return {
    id: String(d.id),
    renderKey: `all-${d.id}`,
    name: d.restaurantName,
    image: d.image || "/placeholder-restaurant.jpg",
    rating: 0,
    cuisineType: d.description || "NhÃ  hÃ ng",
    distance: `~ ${d.distanceKm.toFixed(2)} km`,
    address: d.address,
  };
}

export function AllRestaurantsList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressValue, setAddressValue] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef(1);

  const fetchPage = useCallback(
    (lat: number, lng: number, pageNum: number, append: boolean) => {
      if (pageNum === 1) {
        setStatus("loading");
        setError(null);
      } else {
        setLoadingMore(true);
      }
      getRestaurantsAll(lat, lng, pageNum, PAGE_SIZE)
        .then((result) => {
          const mapped = result.items.map(dtoToRestaurant);
          if (append) {
            setRestaurants((prev) => [...prev, ...mapped]);
          } else {
            setRestaurants(mapped);
          }
          nextPageRef.current = result.page + 1;
          setHasNextPage(result.hasNextPage);
          setStatus("success");
        })
        .catch((err) => {
          if (pageNum === 1) {
            setError(
              err?.message ?? "KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch nhÃ  hÃ ng."
            );
            setStatus("error");
          }
        })
        .finally(() => {
          setLoadingMore(false);
        });
    },
    []
  );

  const requestLocation = useCallback(
    (skipCache = false) => {
      if (!navigator?.geolocation) {
        setStatus("empty");
        return;
      }
      if (!skipCache) {
        const cached = getCachedPosition();
        if (cached) {
          setCoords(cached);
          fetchPage(cached.lat, cached.lng, 1, false);
          return;
        }
      }
      setStatus("loading");
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCachedPosition(lat, lng);
          setCoords({ lat, lng });
          fetchPage(lat, lng, 1, false);
        },
        () => setStatus("empty"),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    },
    [fetchPage]
  );

  useEffect(() => {
    requestLocation(false);
  }, [requestLocation]);

  useEffect(() => {
    if (!coords || !hasNextPage || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const nextPage = nextPageRef.current;
        fetchPage(coords.lat, coords.lng, nextPage, true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [coords, hasNextPage, loadingMore, fetchPage]);

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressValue.trim();
    if (!trimmed) return;
    setAddressLoading(true);
    setError(null);
    try {
      const c = await geocodeAddress(trimmed);
      if (!c) {
        setError("KhÃ´ng tÃ¬m tháº¥y Ä‘á»‹a chá»‰. Báº¡n thá»­ nháº­p rÃµ hÆ¡n nhÃ©.");
        return;
      }
      setCachedPosition(c.lat, c.lon);
      setCoords({ lat: c.lat, lng: c.lon });
      fetchPage(c.lat, c.lon, 1, false);
      setShowAddressInput(false);
      setAddressValue("");
    } catch {
      setError("KhÃ´ng tÃ¬m Ä‘Æ°á»£c nhÃ  hÃ ng theo Ä‘á»‹a chá»‰ nÃ y.");
    } finally {
      setAddressLoading(false);
    }
  };

  if (status === "loading" && restaurants.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl bg-slate-200"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <MapPin className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <p className="mb-6 max-w-md text-slate-700">
          S2O chÆ°a biáº¿t báº¡n Ä‘ang á»Ÿ Ä‘Ã¢u! Nháº­p Ä‘á»‹a chá»‰ Ä‘á»ƒ khÃ¡m phÃ¡ cÃ¡c nhÃ  hÃ ng
          ngon quanh báº¡n nhÃ©.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowAddressInput((v) => !v)}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Nháº­p Ä‘á»‹a chá»‰ cá»§a báº¡n
          </button>
          <button
            type="button"
            onClick={() => requestLocation(true)}
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-800 hover:decoration-slate-500"
          >
            Báº­t vá»‹ trÃ­ (GPS)
          </button>
        </div>
        {showAddressInput && (
          <form
            onSubmit={handleSubmitAddress}
            className="mt-6 w-full max-w-sm space-y-2"
          >
            <input
              type="text"
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              placeholder="VÃ­ dá»¥: 50 LÃª VÄƒn Viá»‡t, Quáº­n 9, TP.HCM"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
              disabled={addressLoading}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addressLoading || !addressValue.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-emerald-700"
              >
                {addressLoading ? "Äang tÃ¬m..." : "TÃ¬m nhÃ  hÃ ng"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddressInput(false);
                  setAddressValue("");
                  setError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Há»§y
              </button>
            </div>
            {error && (
              <p className="text-left text-sm text-amber-600">{error}</p>
            )}
          </form>
        )}
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
        KhÃ´ng cÃ³ nhÃ  hÃ ng nÃ o.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.renderKey ?? restaurant.id}
            restaurant={restaurant}
          />
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { getNearbyRestaurants } from "@/services/restaurantService";
import type { Restaurant } from "@/types";

const DEFAULT_RADIUS_KM = 5;
const DEFAULT_LIMIT = 10;
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

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
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

function fetchNearbyAndSet(
  lat: number,
  lon: number,
  setRestaurants: (r: Restaurant[]) => void,
  setStatus: (s: Status) => void,
  setError: (e: string | null) => void
) {
  setStatus("loading");
  setError(null);
  getNearbyRestaurants({
    latitude: lat,
    longitude: lon,
    radiusKm: DEFAULT_RADIUS_KM,
    limit: DEFAULT_LIMIT,
  })
    .then((data) => {
      setRestaurants(data);
      setStatus("success");
    })
    .catch((err) => {
      setError(err?.message ?? "Không tải được nhà hàng gần bạn.");
      setStatus("error");
    });
}

export function NearbyRestaurantGrid() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressValue, setAddressValue] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);

  const requestLocation = useCallback((skipCache = false) => {
    if (!navigator?.geolocation) {
      setStatus("empty");
      return;
    }
    if (!skipCache) {
      const cached = getCachedPosition();
      if (cached) {
        fetchNearbyAndSet(
          cached.lat,
          cached.lng,
          setRestaurants,
          setStatus,
          setError
        );
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
        fetchNearbyAndSet(lat, lng, setRestaurants, setStatus, setError);
      },
      () => setStatus("empty"),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    requestLocation(false);
  }, [requestLocation]);

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressValue.trim();
    if (!trimmed) return;
    setAddressLoading(true);
    setError(null);
    try {
      const coords = await geocodeAddress(trimmed);
      if (!coords) {
        setError("Không tìm thấy địa chỉ. Bạn thử nhập rõ hơn nhé.");
        return;
      }
      await getNearbyRestaurants({
        latitude: coords.lat,
        longitude: coords.lon,
        radiusKm: DEFAULT_RADIUS_KM,
        limit: DEFAULT_LIMIT,
      }).then((data) => {
        setRestaurants(data);
        setStatus("success");
        setShowAddressInput(false);
        setAddressValue("");
      });
    } catch (err) {
      setError("Không tìm được nhà hàng theo địa chỉ này.");
    } finally {
      setAddressLoading(false);
    }
  };

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

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <MapPin className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <p className="mb-6 max-w-md text-slate-700">
          S2O chưa biết bạn đang ở đâu! Nhập địa chỉ để khám phá các nhà hàng
          ngon quanh bạn nhé.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowAddressInput((v) => !v)}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Nhập địa chỉ của bạn
          </button>
          <button
            type="button"
            onClick={() => requestLocation(true)}
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-800 hover:decoration-slate-500"
          >
            Bật vị trí (GPS)
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
              placeholder="Ví dụ: 50 Lê Văn Việt, Quận 9, TP.HCM"
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
                {addressLoading ? "Đang tìm..." : "Tìm nhà hàng"}
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
                Hủy
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
        Không có nhà hàng nào trong bán kính {DEFAULT_RADIUS_KM} km.
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
            key={restaurant.id}
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

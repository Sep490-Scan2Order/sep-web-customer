"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { RestaurantCard } from "./RestaurantCard";
import { getNearbyRestaurants } from "@/services/restaurantService";
import type { Restaurant } from "@/types";

const DEFAULT_RADIUS_KM = 5;
const DEFAULT_LIMIT = 10;
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

  const requestLocation = useCallback((skipCache = false) => {
    if (!navigator?.geolocation) {
      setError(
        "Thiết bị hoặc trình duyệt của bạn không hỗ trợ định vị. Vui lòng bật GPS hoặc dùng trình duyệt khác."
      );
      setStatus("error");
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
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            "Bạn đã tắt quyền truy cập vị trí cho S2O. Hãy bật lại quyền định vị trong phần cài đặt trình duyệt (biểu tượng ổ khóa bên cạnh thanh địa chỉ), sau đó nhấn lại nút 'Bật vị trí (GPS)'."
          );
        } else {
          setError(
            "Không lấy được vị trí của bạn. Vui lòng kiểm tra GPS/kết nối mạng rồi thử lại."
          );
        }
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    requestLocation(false);
  }, [requestLocation]);

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
          S2O chưa biết bạn đang ở đâu! Hãy bật vị trí (GPS) trên thiết bị và
          cho phép trình duyệt truy cập vị trí để khám phá các nhà hàng ngon
          quanh bạn nhé.
        </p>
        <button
          type="button"
          onClick={() => requestLocation(true)}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Bật vị trí (GPS)
        </button>
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

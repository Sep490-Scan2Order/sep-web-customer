"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_DELAY_MS = 300;

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer for real-time search feedback (optional logging)
    if (value.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        console.log("Debounced search query:", value.trim());
        // Real-time search logic could go here (e.g., fetch suggestions)
      }, DEBOUNCE_DELAY_MS);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      // If empty, just go to search results page
      router.push("/search");
      return;
    }

    // Navigate to search results page with keyword query param
    router.push(`/search?keyword=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <section className="relative overflow-hidden bg-[#F6F3EC] px-4 py-16 sm:py-24">
      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-emerald-900 sm:text-5xl lg:text-6xl">
          Scan. Order. Enjoy.
        </h1>
        <p className="mb-10 text-lg text-slate-900 sm:text-xl">
          Tìm nhà hàng yêu thích và đặt món chỉ với một cú quét
        </p>

        <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Tìm nhà hàng hoặc món ăn..."
                value={searchQuery}
                onChange={handleInputChange}
                className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-lg placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-700 sm:rounded-r-none"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-slate-900 px-8 py-4 font-semibold text-white transition-colors hover:bg-slate-800 sm:rounded-l-none"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

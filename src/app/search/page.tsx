"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { MainLayout } from "@/components/ui/common";
import { HybridSearchResults } from "@/components/ui/common/HybridSearchResults";
import { ROUTES } from "@/constants/routes";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword");
  const [searchQuery, setSearchQuery] = useState(keyword || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      router.push(`/search?keyword=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link
        href={ROUTES.HOME}
        className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Trang chủ
      </Link>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Kết quả tìm kiếm</h1>
        {keyword && (
          <p className="text-lg text-slate-600">
            Tìm kiếm cho: <span className="font-semibold">"{keyword}"</span>
          </p>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Tìm nhà hàng hoặc món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-0 bg-white py-3 pl-12 pr-4 text-slate-900 shadow-md placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-700 sm:rounded-r-none"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800 sm:rounded-l-none"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Search Results */}
      {keyword ? (
        <HybridSearchResults keyword={keyword} />
      ) : (
        <div className="rounded-xl bg-slate-100 p-8 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <p className="text-lg font-medium text-slate-600">Không có từ khóa tìm kiếm</p>
          <p className="mt-2 text-sm text-slate-500">
            Quay lại trang chủ để tìm kiếm nhà hàng hoặc món ăn
          </p>
          <Link
            href={ROUTES.HOME}
            className="mt-4 inline-block rounded-lg bg-slate-900 px-6 py-2 font-medium text-white transition-colors hover:bg-slate-800"
          >
            Trang chủ
          </Link>
        </div>
      )}
    </div>
  );
}

function SearchPageFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={ROUTES.HOME}
        className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Trang chủ
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Kết quả tìm kiếm</h1>
      <div className="mb-8 h-12 animate-pulse rounded-xl bg-slate-200" aria-hidden />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-hidden />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <MainLayout>
      <Suspense fallback={<SearchPageFallback />}>
        <SearchPageContent />
      </Suspense>
    </MainLayout>
  );
}

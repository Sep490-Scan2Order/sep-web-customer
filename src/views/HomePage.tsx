import { HeroSection } from "@/components/HeroSection";
import { RestaurantCard } from "@/components/RestaurantCard";
import { mockRestaurants } from "@/lib/mockData";

export function HomePage() {
  return (
    <>
      <HeroSection />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold text-slate-900">
          Nhà hàng nổi bật
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>
    </>
  );
}

import { notFound } from "next/navigation";
import { mockRestaurants } from "@/lib/mockData";
import { MainLayout } from "@/layouts";

interface RestaurantPageProps {
  params: Promise<{ id: string }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { id } = await params;
  const restaurant = mockRestaurants.find((r) => r.id === id);

  if (!restaurant) {
    notFound();
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-slate-600">
          Cuisine: {restaurant.cuisineType} | Rating: {restaurant.rating} |
          Distance: {restaurant.distance}
        </p>
        {/* TODO: Add full restaurant detail UI */}
      </div>
    </MainLayout>
  );
}

import { MainLayout } from "@/layouts";
import { getRestaurants } from "@/services";
import { HomePage } from "@/views";

export default async function Page() {
  const restaurants = await getRestaurants();

  return (
    <MainLayout>
      <HomePage restaurants={restaurants} />
    </MainLayout>
  );
}

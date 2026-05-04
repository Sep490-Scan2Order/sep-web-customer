import { MainLayout } from "@/components/ui/common";
import { HomePage } from "@/views";
import { Suspense } from "react";

export default function Page() {
  return (
    <MainLayout>
      <Suspense>
        <HomePage />
      </Suspense>
    </MainLayout>
  );
}

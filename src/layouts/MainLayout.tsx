"use client";

import { Header } from "@/components/Header";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen">
      <Header />
      <main>{children}</main>
    </div>
  );
}

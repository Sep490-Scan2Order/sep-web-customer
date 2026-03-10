"use client";

import { Header } from "../Header";
import { Footer } from "../Footer";

interface MainLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export function MainLayout({
  children,
  hideHeader = false,
  hideFooter = false,
}: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {!hideHeader && <Header />}
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}

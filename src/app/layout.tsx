import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "S2O - Scan2Order | Tìm nhà hàng, đặt món dễ dàng",
  description: "Nền tảng đặt món tại nhà hàng với công nghệ quét mã QR. Scan. Order. Enjoy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

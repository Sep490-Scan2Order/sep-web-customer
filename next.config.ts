import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "example.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pasgo.vn",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ysafyqmiutvhohvsthnt.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

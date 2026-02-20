import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: "export" to support Vercel deployment with API routes
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
};

export default nextConfig;

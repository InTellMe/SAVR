import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Temporarily disabled to allow dynamic routes
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

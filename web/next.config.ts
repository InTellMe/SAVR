import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  turbopack: {
    // Set root to parent directory to silence lockfile warning
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TODO: Re-enable static export once /r/[id] route is refactored
  // Current issue: Dynamic route with client-side Firebase data fetching is incompatible with static export
  // Solutions: 1) Move to server-side data fetching, 2) Pre-generate known recipe IDs, or 3) Use standard Next.js deployment
  // output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

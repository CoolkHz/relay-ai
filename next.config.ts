import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // OpenAI compatible routes
      { source: "/v1/:path*", destination: "/api/v1/:path*" },
      // Anthropic compatible routes
      { source: "/anthropic/:path*", destination: "/api/anthropic/:path*" },
    ];
  },
};

export default nextConfig;

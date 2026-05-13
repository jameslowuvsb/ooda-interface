import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {
    resolveAlias: {},
  },
  serverExternalPackages: ["ws"],
  experimental: {
    largePageDataBytes: 512 * 1000,
  },
};

export default nextConfig;

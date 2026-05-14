import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {
    resolveAlias: {
      // Redirect bare "cesium" imports to our global shim instead of
      // node_modules/cesium (which Turbopack can't bundle due to WASM \0 escapes).
      // Deep imports like "cesium/Build/Cesium/Widgets/widgets.css" still
      // resolve to node_modules since this is an exact-match alias.
      cesium: "./src/lib/cesium-global.ts",
    },
  },
  serverExternalPackages: ["ws"],
  experimental: {
    largePageDataBytes: 512 * 1000,
  },
  env: {
    NEXT_PUBLIC_CESIUM_ION_TOKEN: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
};

export default nextConfig;

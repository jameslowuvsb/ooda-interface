import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "OODA — Open Source Intelligence Interface",
  description:
    "Real-time geospatial intelligence platform built on the OODA loop",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Set CESIUM_BASE_URL before Cesium.js loads so it finds Workers/Assets */}
        <Script strategy="beforeInteractive" id="cesium-base-url">
          {`window.CESIUM_BASE_URL = "/cesium";`}
        </Script>
        {/* Load Cesium as a classic (non-module) script — avoids Turbopack's
            template-literal conversion that breaks WASM \0 escape sequences */}
        <Script strategy="beforeInteractive" src="/cesium/Cesium.js" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

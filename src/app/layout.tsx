import type { Metadata } from "next";
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
      <body className="antialiased">{children}</body>
    </html>
  );
}

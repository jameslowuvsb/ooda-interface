/**
 * Cesium global shim — re-exports window.Cesium loaded via <script> tag.
 *
 * WHY: Cesium's pre-built JS embeds WASM binary data using \0 (null) escape
 * sequences. Turbopack (Next.js 16's only bundler) converts strings to template
 * literals, where \0 is illegal in strict mode (ES modules). Loading Cesium via
 * a classic <script> tag avoids Turbopack entirely.
 *
 * HOW: layout.tsx loads /cesium/Cesium.js via <Script strategy="beforeInteractive">,
 * which injects into <head> before any app code. By the time this shim evaluates,
 * window.Cesium is available. turbopack.resolveAlias maps "cesium" → this file.
 *
 * TypeScript still resolves to node_modules/cesium for type-checking (tsconfig
 * paths are separate from Turbopack aliases), so full Cesium types are preserved.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const C: any =
  typeof window !== "undefined"
    ? (window as unknown as Record<string, any>).Cesium
    : undefined;

// Fallback for SSR — provide empty object so destructuring doesn't crash
const F: any = C || {};

// ── Named exports used across the codebase ──────────────────────────
export const Cartesian2 = F.Cartesian2;
export const Cartesian3 = F.Cartesian3;
export const Cartographic = F.Cartographic;
export const CesiumTerrainProvider = F.CesiumTerrainProvider;
export const Color = F.Color;
export const Credit = F.Credit;
export const CustomDataSource = F.CustomDataSource;
export const DistanceDisplayCondition = F.DistanceDisplayCondition;
export const Entity = F.Entity;
export const GoogleMaps = F.GoogleMaps;
export const HorizontalOrigin = F.HorizontalOrigin;
export const ImageryLayer = F.ImageryLayer;
export const Ion = F.Ion;
export const JulianDate = F.JulianDate;
export const LabelStyle = F.LabelStyle;
export const Math = F.Math;
export const NearFarScalar = F.NearFarScalar;
export const PolylineDashMaterialProperty = F.PolylineDashMaterialProperty;
export const PropertyBag = F.PropertyBag;
export const ScreenSpaceEventHandler = F.ScreenSpaceEventHandler;
export const ScreenSpaceEventType = F.ScreenSpaceEventType;
export const SkyAtmosphere = F.SkyAtmosphere;
export const UrlTemplateImageryProvider = F.UrlTemplateImageryProvider;
export const VerticalOrigin = F.VerticalOrigin;
export const Viewer = F.Viewer;
export const createGooglePhotorealistic3DTileset =
  F.createGooglePhotorealistic3DTileset;
export const defined = F.defined;

// Default export = full Cesium namespace (for `import Cesium from "cesium"`)
export default C;

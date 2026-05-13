import * as Cesium from "cesium";

export function initCesium() {
  (window as unknown as Record<string, unknown>).CESIUM_BASE_URL = "/cesium";

  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
  } else {
    Cesium.Ion.defaultAccessToken = undefined as unknown as string;
  }

  // Set Google Maps API key for 3D Photorealistic Tiles
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    Cesium.GoogleMaps.defaultApiKey = googleKey;
  }
}

/** Dark-themed CartoDB tiles */
export function createDarkImageryProvider(): Cesium.UrlTemplateImageryProvider {
  return new Cesium.UrlTemplateImageryProvider({
    url: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    credit: new Cesium.Credit("CartoDB Dark Matter"),
    minimumLevel: 0,
    maximumLevel: 18,
  });
}

/** Default viewer options — 3D globe with atmosphere */
export const viewerOptions: Partial<Cesium.Viewer.ConstructorOptions> = {
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  scene3DOnly: true,
  skyBox: false,
  skyAtmosphere: new Cesium.SkyAtmosphere(), // Blue glow around Earth
  contextOptions: {
    webgl: {
      alpha: false,
      antialias: true,
      depth: true,
    },
  },
  requestRenderMode: false,
  maximumRenderTimeChange: Infinity,
};

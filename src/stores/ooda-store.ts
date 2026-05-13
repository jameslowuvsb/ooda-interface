import { create } from "zustand";
import * as Cesium from "cesium";
import type {
  ViewMode,
  MapStyle,
  LayerState,
  LayerKey,
  CursorPosition,
  EntityInfo,
  Flight,
  Satellite,
  Vessel,
  Earthquake,
  NewsArticle,
  Viewport,
} from "@/types";

interface OODAStore {
  // ── Layers ──────────────────────────────────
  layers: LayerState;
  toggleLayer: (layer: LayerKey) => void;

  // ── View Mode ───────────────────────────────
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  mapStyle: MapStyle;
  setMapStyle: (style: MapStyle) => void;

  // ── Cursor & Selection ──────────────────────
  cursorPosition: CursorPosition | null;
  setCursorPosition: (pos: CursorPosition | null) => void;

  selectedEntity: EntityInfo | null;
  setSelectedEntity: (entity: EntityInfo | null) => void;

  // ── OBSERVE: Layer Data ─────────────────────
  flights: Flight[];
  setFlights: (flights: Flight[]) => void;

  satellites: Satellite[];
  setSatellites: (satellites: Satellite[]) => void;

  vessels: Vessel[];
  setVessels: (vessels: Vessel[]) => void;

  earthquakes: Earthquake[];
  setEarthquakes: (earthquakes: Earthquake[]) => void;

  news: NewsArticle[];
  setNews: (news: NewsArticle[]) => void;

  // ── Viewport ────────────────────────────────
  viewport: Viewport;
  setViewport: (v: Viewport) => void;

  // ── UI State ─────────────────────────────────
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // ── Cesium Viewer ───────────────────────────
  viewer: Cesium.Viewer | null;
  setViewer: (viewer: Cesium.Viewer | null) => void;
  flyTo: (lon: number, lat: number, alt?: number) => void;
}

export const useOODAStore = create<OODAStore>((set, get) => ({
  // Layers — all on by default
  layers: {
    flights: true,
    satellites: true,
    vessels: true,
    earthquakes: true,
    weather: true,
    news: true,
  },
  toggleLayer: (layer) =>
    set((s) => ({
      layers: { ...s.layers, [layer]: !s.layers[layer] },
    })),

  // View
  viewMode: "eo",
  setViewMode: (mode) => set({ viewMode: mode }),

  mapStyle: "dark",
  setMapStyle: (style) => set({ mapStyle: style }),

  // Cursor
  cursorPosition: null,
  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  selectedEntity: null,
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),

  // OBSERVE data
  flights: [],
  setFlights: (flights) => set({ flights }),

  satellites: [],
  setSatellites: (satellites) => set({ satellites }),

  vessels: [],
  setVessels: (vessels) => set({ vessels }),

  earthquakes: [],
  setEarthquakes: (earthquakes) => set({ earthquakes }),

  news: [],
  setNews: (news) => set({ news }),

  // Viewport
  viewport: {
    centerLat: 26.5,
    centerLon: 56.3,
    altitude: 5000000,
    radiusKm: 5000,
  },
  setViewport: (v) => set({ viewport: v }),

  // UI State
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // Cesium viewer ref
  viewer: null,
  setViewer: (viewer) => set({ viewer }),
  flyTo: (lon, lat, alt = 2000000) => {
    const viewer = get().viewer;
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      duration: 1.5,
    });
  },
}));

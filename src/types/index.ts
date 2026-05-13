// ── View & Layout ──────────────────────────────────────
export type ViewMode = "eo" | "flir" | "nightvision" | "crt";
export type MapStyle = "dark" | "terrain" | "satellite";

// ── OODA Layer Keys ────────────────────────────────────
export type LayerKey =
  | "flights"
  | "satellites"
  | "vessels"
  | "earthquakes"
  | "weather"
  | "news";

export interface LayerState {
  flights: boolean;
  satellites: boolean;
  vessels: boolean;
  earthquakes: boolean;
  weather: boolean;
  news: boolean;
}

// ── Cursor & Selection ─────────────────────────────────
export interface CursorPosition {
  lat: number;
  lon: number;
  alt: number;
}

export interface EntityInfo {
  id: string;
  type: "flight" | "satellite" | "vessel" | "earthquake" | "news" | "recon";
  name: string;
  details: Record<string, string | number>;
  lon: number;
  lat: number;
  alt?: number;
}

// ── OBSERVE: Flight Data (ADS-B) ──────────────────────
export interface Flight {
  icao24: string;
  callsign: string;
  originCountry: string;
  registration: string;
  aircraftType: string;
  longitude: number;
  latitude: number;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  geoAltitude: number | null;
  squawk: string | null;
  lastContact: number;
}

// ── OBSERVE: Satellite Data (TLE) ─────────────────────
export interface Satellite {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number; // km
  velocity: number; // km/s
  category: string;
}

// ── OBSERVE: Vessel Data (AIS) ────────────────────────
export interface Vessel {
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number; // knots
  heading: number;
  shipType: string;
  flag: string;
  destination: string;
  lastUpdate: number;
}

// ── OBSERVE: Earthquake Data (USGS) ───────────────────
export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depth: number; // km
  tsunami: boolean;
  alert: string | null;
  felt: number | null;
}

// ── OBSERVE: News / GDELT Data ────────────────────────
export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  latitude: number;
  longitude: number;
  date: string;
  tone: number;
  imageUrl?: string;
}

// ── Viewport ───────────────────────────────────────────
export interface Viewport {
  centerLat: number;
  centerLon: number;
  altitude: number;
  radiusKm: number;
}

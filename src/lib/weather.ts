/**
 * Weather data fetcher for strategic chokepoints.
 * Uses OpenWeatherMap API (free tier: 60 calls/min, 1M calls/month).
 *
 * Shared module used by both /api/weather route and /api/act OODA loop.
 */

export interface WeatherPoint {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  temp: number;          // Celsius
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;     // m/s
  windDeg: number;
  windGust?: number;
  visibility: number;    // meters
  condition: string;     // e.g. "Clouds", "Rain", "Clear"
  description: string;   // e.g. "broken clouds"
  icon: string;          // OWM icon code
  seaState?: string;     // Estimated from wind
  clouds: number;        // % cloud cover
}

// Strategic locations matching our AIS monitoring regions
const WEATHER_POINTS = [
  { id: "hormuz",      name: "Strait of Hormuz",  lat: 26.5,  lon: 56.3  },
  { id: "bab",         name: "Bab-el-Mandeb",     lat: 12.6,  lon: 43.3  },
  { id: "suez",        name: "Suez Canal",         lat: 30.0,  lon: 32.5  },
  { id: "malacca",     name: "Strait of Malacca",  lat: 2.5,   lon: 101.5 },
  { id: "scs",         name: "South China Sea",    lat: 12.0,  lon: 114.0 },
  { id: "gibraltar",   name: "Strait of Gibraltar", lat: 36.0,  lon: -5.5  },
  { id: "channel",     name: "English Channel",    lat: 50.5,  lon: 0.0   },
  { id: "taiwan",      name: "Taiwan Strait",      lat: 24.0,  lon: 119.0 },
  { id: "panama",      name: "Panama Canal",       lat: 9.0,   lon: -79.5 },
  { id: "cape",        name: "Cape of Good Hope",  lat: -34.3, lon: 18.5  },
];

// Beaufort scale estimation from wind speed (m/s)
function estimateSeaState(windSpeed: number): string {
  if (windSpeed < 0.5) return "Calm (glassy)";
  if (windSpeed < 1.5) return "Calm (rippled)";
  if (windSpeed < 3.3) return "Smooth";
  if (windSpeed < 5.5) return "Slight";
  if (windSpeed < 8.0) return "Moderate";
  if (windSpeed < 10.8) return "Rough";
  if (windSpeed < 13.9) return "Very Rough";
  if (windSpeed < 17.2) return "High";
  if (windSpeed < 20.8) return "Very High";
  return "Phenomenal";
}

/**
 * Fetch weather data for all strategic chokepoints.
 * Returns an empty array if no API key is configured or on failure.
 */
export async function fetchWeatherData(): Promise<WeatherPoint[]> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const results: WeatherPoint[] = [];

    // Fetch weather for all strategic points in parallel
    const promises = WEATHER_POINTS.map(async (point) => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lon}&appid=${apiKey}&units=metric`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) return null;

        const data = await res.json();
        const weather = data.weather?.[0] || {};
        const wind = data.wind || {};
        const main = data.main || {};

        return {
          id: point.id,
          location: point.name,
          latitude: point.lat,
          longitude: point.lon,
          temp: Math.round(main.temp ?? 0),
          feelsLike: Math.round(main.feels_like ?? 0),
          humidity: main.humidity ?? 0,
          pressure: main.pressure ?? 0,
          windSpeed: wind.speed ?? 0,
          windDeg: wind.deg ?? 0,
          windGust: wind.gust,
          visibility: data.visibility ?? 10000,
          condition: weather.main || "Unknown",
          description: weather.description || "",
          icon: weather.icon || "",
          seaState: estimateSeaState(wind.speed ?? 0),
          clouds: data.clouds?.all ?? 0,
        } as WeatherPoint;
      } catch {
        return null;
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }

    return results;
  } catch (error) {
    console.error("Weather fetch error:", error);
    return [];
  }
}

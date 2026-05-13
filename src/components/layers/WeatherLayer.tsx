"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useWeather } from "@/hooks/useWeather";

interface Props {
  viewer: Cesium.Viewer;
}

// Weather condition → color mapping
const CONDITION_COLORS: Record<string, string> = {
  Clear: "#00ff41",
  Clouds: "#aaaaaa",
  Rain: "#4488ff",
  Drizzle: "#6699cc",
  Thunderstorm: "#ff4444",
  Snow: "#ffffff",
  Mist: "#88aa88",
  Fog: "#666666",
  Haze: "#aa8844",
  Dust: "#cc8800",
  Sand: "#cc8800",
  Smoke: "#888888",
  Tornado: "#ff0000",
  Squall: "#ff8800",
};

// Wind direction arrow from degrees
function windArrow(deg: number): string {
  const arrows = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  return arrows[Math.round(deg / 45) % 8];
}

export function WeatherLayer({ viewer }: Props) {
  const weather = useWeather();
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("weather");
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    };
  }, [viewer]);

  useEffect(() => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    ds.entities.removeAll();

    for (const w of weather) {
      const color = CONDITION_COLORS[w.condition] || "#888888";
      const isHazardous = w.windSpeed > 10 || w.visibility < 2000 ||
        w.condition === "Thunderstorm" || w.condition === "Tornado";

      // Weather station marker
      ds.entities.add({
        id: `weather-${w.id}`,
        position: Cesium.Cartesian3.fromDegrees(w.longitude, w.latitude, 0),
        point: {
          pixelSize: isHazardous ? 8 : 5,
          color: Cesium.Color.fromCssColorString(color).withAlpha(isHazardous ? 0.9 : 0.6),
          outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.3),
          outlineWidth: isHazardous ? 6 : 3,
        },
        label: {
          text: `${w.location}\n${w.temp}°C ${windArrow(w.windDeg)}${w.windSpeed.toFixed(0)}m/s\n${w.description} | ${w.seaState || ""}`,
          font: "9px monospace",
          fillColor: Cesium.Color.fromCssColorString(color),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("#000a00").withAlpha(0.8),
          backgroundPadding: new Cesium.Cartesian2(5, 3),
        },
        properties: {
          type: "weather",
          location: w.location,
          temp: w.temp,
          windSpeed: w.windSpeed,
          windDeg: w.windDeg,
          condition: w.condition,
          description: w.description,
          seaState: w.seaState || "",
          visibility: w.visibility,
          humidity: w.humidity,
          pressure: w.pressure,
        } as unknown as Cesium.PropertyBag,
      });

      // Wind direction line
      if (w.windSpeed > 1) {
        const windRad = Cesium.Math.toRadians(w.windDeg);
        // Line length proportional to wind speed
        const len = Math.min(w.windSpeed * 0.1, 2); // degrees
        const endLat = w.latitude + Math.cos(windRad) * len;
        const endLon = w.longitude + Math.sin(windRad) * len;

        ds.entities.add({
          id: `weather-wind-${w.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              w.longitude, w.latitude, endLon, endLat,
            ]),
            width: 1.5,
            material: Cesium.Color.fromCssColorString(color).withAlpha(0.3),
            clampToGround: true,
          },
        });
      }

      // Visibility ring for hazardous conditions
      if (isHazardous) {
        const ringPositions: number[] = [];
        for (let a = 0; a <= 360; a += 15) {
          const rad = Cesium.Math.toRadians(a);
          ringPositions.push(
            w.longitude + Math.cos(rad) * 0.5,
            w.latitude + Math.sin(rad) * 0.5
          );
        }
        ds.entities.add({
          id: `weather-hazard-${w.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(ringPositions),
            width: 1,
            material: Cesium.Color.fromCssColorString("#ff4444").withAlpha(0.2),
            clampToGround: true,
          },
        });
      }
    }
  }, [weather]);

  return null;
}

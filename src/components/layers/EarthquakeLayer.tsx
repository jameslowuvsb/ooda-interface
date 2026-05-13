"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useOODAStore } from "@/stores/ooda-store";
import { useEarthquakes } from "@/hooks/useEarthquakes";

interface Props {
  viewer: Cesium.Viewer;
}

export function EarthquakeLayer({ viewer }: Props) {
  useEarthquakes();
  const earthquakes = useOODAStore((s) => s.earthquakes);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("earthquakes");
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

    for (const eq of earthquakes) {
      // Size based on magnitude
      const size = Math.max(6, eq.magnitude * 4);

      // Color: yellow < 4, orange 4-6, red > 6
      let color = "#ffff00";
      if (eq.magnitude >= 6) color = "#ff0000";
      else if (eq.magnitude >= 4) color = "#ff6600";

      ds.entities.add({
        id: `eq-${eq.id}`,
        position: Cesium.Cartesian3.fromDegrees(
          eq.longitude,
          eq.latitude,
          0
        ),
        point: {
          pixelSize: size,
          color: Cesium.Color.fromCssColorString(color).withAlpha(0.8),
          outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.4),
          outlineWidth: 3,
        },
        label: {
          text: `M${eq.magnitude.toFixed(1)}`,
          font: "10px monospace",
          fillColor: Cesium.Color.fromCssColorString(color),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            5_000_000
          ),
        },
        properties: {
          type: "earthquake",
          ...eq,
        } as unknown as Cesium.PropertyBag,
      });
    }
  }, [earthquakes]);

  return null;
}

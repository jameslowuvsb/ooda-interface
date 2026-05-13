"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useOODAStore } from "@/stores/ooda-store";
import { useSatellites } from "@/hooks/useSatellites";
import { getSatelliteIcon } from "@/lib/entity-icons";

interface Props {
  viewer: Cesium.Viewer;
}

export function SatelliteLayer({ viewer }: Props) {
  useSatellites();
  const satellites = useOODAStore((s) => s.satellites);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("satellites");
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

    for (const sat of satellites) {
      const icon = getSatelliteIcon(sat.name, sat.category);
      const isStation =
        sat.name.toLowerCase().includes("iss") ||
        sat.name.toLowerCase().includes("station") ||
        sat.category === "station";
      const satColor = Cesium.Color.fromCssColorString("#ff6600");

      ds.entities.add({
        id: `sat-${sat.id}`,
        position: Cesium.Cartesian3.fromDegrees(
          sat.longitude,
          sat.latitude,
          sat.altitude * 1000 // km → m
        ),
        billboard: {
          image: icon,
          scale: isStation ? 1.0 : 0.75,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          color: satColor,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 8e7, 0.3),
        },
        label: {
          text: sat.name,
          font: "10px monospace",
          fillColor: Cesium.Color.fromCssColorString("#ff6600").withAlpha(0.9),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, isStation ? 14 : 10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            3_000_000
          ),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 3e6, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(5e5, 1.0, 3e6, 0.3),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
        },
        properties: {
          type: "satellite",
          ...sat,
        } as unknown as Cesium.PropertyBag,
      });

      // Orbit ground track line (short trail showing recent path)
      // We approximate with a line from a previous position along velocity vector
      if (sat.velocity > 0) {
        // Project backwards ~30 seconds along velocity vector (very rough)
        const trailLen = 2.0; // degrees of trail
        const trailLat = sat.latitude - trailLen * 0.5;
        const trailLon = sat.longitude - trailLen;

        ds.entities.add({
          id: `sat-trail-${sat.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              trailLon,
              trailLat,
              sat.altitude * 1000,
              sat.longitude,
              sat.latitude,
              sat.altitude * 1000,
            ]),
            width: 1,
            material: Cesium.Color.fromCssColorString("#ff6600").withAlpha(0.15),
          },
        });
      }
    }
  }, [satellites]);

  return null;
}

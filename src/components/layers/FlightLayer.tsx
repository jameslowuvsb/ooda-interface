"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useOODAStore } from "@/stores/ooda-store";
import { useFlights } from "@/hooks/useFlights";
import { aircraftIcon } from "@/lib/entity-icons";

interface Props {
  viewer: Cesium.Viewer;
}

export function FlightLayer({ viewer }: Props) {
  useFlights();
  const flights = useOODAStore((s) => s.flights);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("flights");
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.dataSources.remove(ds, true);
      }
    };
  }, [viewer]);

  useEffect(() => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    ds.entities.removeAll();

    // Pre-render white icon — CesiumJS billboard color handles tinting
    const icon = aircraftIcon(32);
    const flightColor = Cesium.Color.fromCssColorString("#00ff41");

    for (const flight of flights) {
      const rawAlt = flight.baroAltitude ?? flight.geoAltitude ?? 10000;
      const alt = typeof rawAlt === "number" ? rawAlt : 10000;

      // trueTrack is clockwise from north in degrees
      // CesiumJS billboard rotation is counterclockwise in radians
      const heading = flight.trueTrack ?? 0;
      const rotation = -Cesium.Math.toRadians(heading);

      ds.entities.add({
        id: `flight-${flight.icao24}`,
        position: Cesium.Cartesian3.fromDegrees(
          flight.longitude,
          flight.latitude,
          alt
        ),
        billboard: {
          image: icon,
          scale: 0.8,
          rotation,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          color: flightColor,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 5e7, 0.2),
        },
        label: {
          text: flight.callsign || flight.icao24,
          font: "10px monospace",
          fillColor: Cesium.Color.fromCssColorString("#00ff41").withAlpha(0.9),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 14),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            800_000
          ),
          scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 8e5, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(1e5, 1.0, 8e5, 0.3),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
        },
        properties: {
          type: "flight",
          ...flight,
        } as unknown as Cesium.PropertyBag,
      });
    }
  }, [flights]);

  return null;
}

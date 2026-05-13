"use client";

import { useEffect, useRef, useMemo } from "react";
import * as Cesium from "cesium";
import { useOODAStore } from "@/stores/ooda-store";
import { useVessels } from "@/hooks/useVessels";
import { getVesselIcon, anchoredIcon } from "@/lib/entity-icons";

interface Props {
  viewer: Cesium.Viewer;
}

// Color by ship type for quick visual classification
const VESSEL_COLORS: Record<string, string> = {
  Tanker: "#ff3333",
  Cargo: "#00aaff",
  Passenger: "#ffffff",
  Military: "#ff00ff",
  Fishing: "#88ff88",
  Tug: "#44cccc",
  HSC: "#ff8800",
  "Law Enforcement": "#ff00ff",
  Pilot: "#ffff00",
  SAR: "#ff4444",
  Unknown: "#888888",
};

function getVesselColor(shipType: string): string {
  return VESSEL_COLORS[shipType] || VESSEL_COLORS.Unknown;
}

export function VesselLayer({ viewer }: Props) {
  useVessels();
  const vessels = useOODAStore((s) => s.vessels);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("vessels");
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    };
  }, [viewer]);

  // Pre-build white icon cache for each ship type — CesiumJS billboard color tints them
  const iconCache = useMemo(() => {
    const cache: Record<string, HTMLCanvasElement> = {};
    for (const type of Object.keys(VESSEL_COLORS)) {
      cache[type] = getVesselIcon(type);
      cache[`${type}-anchor`] = anchoredIcon();
    }
    return cache;
  }, []);

  useEffect(() => {
    const ds = dataSourceRef.current;
    if (!ds) return;

    ds.entities.removeAll();

    for (const vessel of vessels) {
      const color = getVesselColor(vessel.shipType);
      const isAnchored = vessel.speed < 0.5;

      // Use heading for rotation. Fallback to course.
      const headingDeg =
        vessel.heading > 0 ? vessel.heading : vessel.course > 0 ? vessel.course : 0;
      const rotation = -Cesium.Math.toRadians(headingDeg);

      // Pick icon based on type and anchored state
      const icon = isAnchored
        ? iconCache[`${vessel.shipType}-anchor`] || iconCache["Unknown-anchor"]
        : iconCache[vessel.shipType] || iconCache["Unknown"];

      ds.entities.add({
        id: `vessel-${vessel.mmsi}`,
        position: Cesium.Cartesian3.fromDegrees(
          vessel.longitude,
          vessel.latitude,
          0
        ),
        billboard: {
          image: icon,
          scale: isAnchored ? 0.7 : 0.85,
          rotation: isAnchored ? 0 : rotation,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          color: Cesium.Color.fromCssColorString(color).withAlpha(
            isAnchored ? 0.6 : 0.95
          ),
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 5e7, 0.2),
        },
        label: {
          text: vessel.name || vessel.mmsi,
          font: "10px monospace",
          fillColor: Cesium.Color.fromCssColorString(color).withAlpha(0.9),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 12),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            600_000
          ),
          scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 6e5, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(1e5, 1.0, 6e5, 0.3),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.5),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
        },
        properties: {
          type: "vessel",
          ...vessel,
        } as unknown as Cesium.PropertyBag,
      });

      // Wake/trail line for moving vessels
      if (!isAnchored && headingDeg > 0) {
        const headingRad = Cesium.Math.toRadians(headingDeg);
        // Trail extends behind the vessel (opposite of heading)
        const trailLen = Math.min(vessel.speed * 0.003, 0.04);
        const trailLat = vessel.latitude - Math.cos(headingRad) * trailLen;
        const trailLon = vessel.longitude - Math.sin(headingRad) * trailLen;

        ds.entities.add({
          id: `vessel-wake-${vessel.mmsi}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              vessel.longitude,
              vessel.latitude,
              trailLon,
              trailLat,
            ]),
            width: 1,
            material: Cesium.Color.fromCssColorString(color).withAlpha(0.25),
            clampToGround: true,
          },
        });
      }
    }
  }, [vessels, iconCache]);

  return null;
}

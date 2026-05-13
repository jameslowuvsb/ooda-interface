"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useOrient } from "@/hooks/useOrient";

interface Props {
  viewer: Cesium.Viewer;
}

const SEVERITY_COLORS = {
  high: "#ff3333",
  medium: "#ff8800",
  low: "#ffff00",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  ais_gap: "AIS GAP",
  speed_anomaly: "SPEED ANOMALY",
  sts_zone: "STS ZONE",
  heading_mismatch: "HEADING MISMATCH",
};

/**
 * AlertLayer — visualizes ORIENT dark-ship alerts as pulsing markers on the globe.
 * High severity = large red ring, medium = orange, low = yellow.
 * Each alert shows type badge + vessel name + description.
 */
export function AlertLayer({ viewer }: Props) {
  const { alerts } = useOrient();
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("alerts");
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

    for (const alert of alerts) {
      const color = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low;
      const typeLabel = ALERT_TYPE_LABELS[alert.alertType] || alert.alertType.toUpperCase();
      const cesiumColor = Cesium.Color.fromCssColorString(color);

      // Single entity per alert: point marker + concise label
      ds.entities.add({
        id: `alert-${alert.id}`,
        position: Cesium.Cartesian3.fromDegrees(alert.longitude, alert.latitude, 0),
        point: {
          pixelSize: alert.severity === "high" ? 8 : 6,
          color: cesiumColor.withAlpha(0.9),
          outlineColor: cesiumColor.withAlpha(0.3),
          outlineWidth: alert.severity === "high" ? 6 : 4,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.2, 5e7, 0.4),
        },
        label: {
          text: `${typeLabel} · ${alert.vesselName}`,
          font: "10px monospace",
          fillColor: cesiumColor.withAlpha(0.9),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 600_000),
          scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 6e5, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(1e5, 1.0, 6e5, 0.3),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
        },
        properties: {
          type: "alert",
          alertType: alert.alertType,
          severity: alert.severity,
          vesselName: alert.vesselName,
          vesselMmsi: alert.vesselMmsi,
          description: alert.description,
        } as unknown as Cesium.PropertyBag,
      });
    }
  }, [alerts]);

  return null;
}

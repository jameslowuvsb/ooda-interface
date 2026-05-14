"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

// AISstream has no terrestrial receiver coverage in these regions.
// Matches SUPPLEMENT_REGIONS in src/app/api/vessels/route.ts.
const GAPS = [
  { id: "hormuz", name: "Strait of Hormuz", latMin: 23.0, latMax: 30.0, lonMin: 48.0, lonMax: 58.5 },
  { id: "bab",    name: "Bab-el-Mandeb",    latMin:  9.0, latMax: 16.0, lonMin: 41.0, lonMax: 46.0 },
  { id: "panama", name: "Panama Approach",  latMin:  7.0, latMax: 11.0, lonMin: -81.0, lonMax: -77.0 },
];

const GAP_COLOR = "#ffb347"; // amber — matches HUD warning palette

interface Props {
  viewer: Cesium.Viewer;
}

export function CoverageGapLayer({ viewer }: Props) {
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("coverage-gaps");
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const fillColor = Cesium.Color.fromCssColorString(GAP_COLOR).withAlpha(0.08);
    const outlineColor = Cesium.Color.fromCssColorString(GAP_COLOR).withAlpha(0.6);
    const labelColor = Cesium.Color.fromCssColorString(GAP_COLOR);

    for (const g of GAPS) {
      const cx = (g.lonMin + g.lonMax) / 2;
      const cy = (g.latMin + g.latMax) / 2;

      ds.entities.add({
        id: `coverage-gap-${g.id}`,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray([
            g.lonMin, g.latMin,
            g.lonMax, g.latMin,
            g.lonMax, g.latMax,
            g.lonMin, g.latMax,
          ]),
          material: fillColor,
          outline: true,
          outlineColor,
          height: 0,
        },
      });

      ds.entities.add({
        id: `coverage-gap-label-${g.id}`,
        position: Cesium.Cartesian3.fromDegrees(cx, cy, 0),
        label: {
          text: `NO AIS COVERAGE\n${g.name.toUpperCase()}`,
          font: "bold 11px monospace",
          fillColor: labelColor,
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.65),
          backgroundPadding: new Cesium.Cartesian2(8, 4),
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 1.5e7, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(1e7, 1.0, 3e7, 0.0),
        },
      });
    }

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    };
  }, [viewer]);

  return null;
}

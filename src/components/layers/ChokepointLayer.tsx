"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

interface Props {
  viewer: Cesium.Viewer;
}

/**
 * Strategic chokepoint overlays — shipping lanes, territorial waters,
 * exclusion zones. Static geospatial data, no API needed.
 *
 * Strait of Hormuz focus area with:
 * - Inbound/outbound Traffic Separation Scheme (TSS) lanes
 * - Territorial water boundaries (Iran, Oman, UAE)
 * - STS transfer anchorage zones
 * - Key ports and naval bases
 */

interface Chokepoint {
  id: string;
  name: string;
  type: "lane" | "zone" | "base" | "port";
  positions: [number, number][]; // [lon, lat][]
  color: string;
  description: string;
}

const HORMUZ_DATA: Chokepoint[] = [
  // Traffic Separation Scheme — Inbound lane
  {
    id: "tss-inbound",
    name: "TSS INBOUND LANE",
    type: "lane",
    positions: [
      [56.0, 26.2],
      [56.2, 26.35],
      [56.45, 26.52],
      [56.85, 26.6],
      [57.2, 26.4],
    ],
    color: "#00ff4140",
    description: "Inbound traffic separation scheme — westbound into Persian Gulf",
  },
  // Traffic Separation Scheme — Outbound lane
  {
    id: "tss-outbound",
    name: "TSS OUTBOUND LANE",
    type: "lane",
    positions: [
      [57.2, 26.25],
      [56.85, 26.45],
      [56.45, 26.37],
      [56.2, 26.2],
      [56.0, 26.05],
    ],
    color: "#ff660040",
    description: "Outbound traffic separation scheme — eastbound to Gulf of Oman",
  },
  // Khor Fakkan STS anchorage
  {
    id: "sts-khor-fakkan",
    name: "KHOR FAKKAN STS ZONE",
    type: "zone",
    positions: [
      [56.32, 25.28],
      [56.42, 25.28],
      [56.42, 25.38],
      [56.32, 25.38],
      [56.32, 25.28],
    ],
    color: "#ff000030",
    description: "Ship-to-ship transfer anchorage — high risk for illicit cargo swaps",
  },
  // Fujairah STS anchorage
  {
    id: "sts-fujairah",
    name: "FUJAIRAH ANCHORAGE",
    type: "zone",
    positions: [
      [56.28, 25.08],
      [56.42, 25.08],
      [56.42, 25.2],
      [56.28, 25.2],
      [56.28, 25.08],
    ],
    color: "#ff440030",
    description: "Fujairah anchorage and bunkering zone",
  },
  // Iranian territorial waters (simplified)
  {
    id: "iran-tw",
    name: "IRAN TERRITORIAL WATERS",
    type: "zone",
    positions: [
      [54.5, 27.0],
      [55.5, 26.8],
      [56.2, 26.6],
      [56.5, 26.5],
      [57.0, 26.7],
      [57.0, 27.2],
      [56.5, 27.0],
      [55.5, 27.2],
      [54.5, 27.0],
    ],
    color: "#ff000015",
    description: "Iranian territorial waters — 12nm from coast",
  },
  // Key military/naval positions
  {
    id: "bandar-abbas",
    name: "BANDAR ABBAS NAVAL BASE",
    type: "base",
    positions: [[56.28, 27.18]],
    color: "#ff0000",
    description: "IRIN (Iranian Navy) main base — patrol boats, missiles, submarines",
  },
  {
    id: "jask",
    name: "JASK NAVAL BASE",
    type: "base",
    positions: [[57.77, 25.65]],
    color: "#ff0000",
    description: "IRGCN forward operating base — fast attack craft",
  },
  {
    id: "abu-musa",
    name: "ABU MUSA ISLAND",
    type: "base",
    positions: [[55.03, 25.87]],
    color: "#ff6600",
    description: "Disputed island — IRGC garrison, missile batteries",
  },
  // Key ports
  {
    id: "port-rashid",
    name: "PORT RASHID / JEBEL ALI",
    type: "port",
    positions: [[55.06, 25.02]],
    color: "#00aaff",
    description: "UAE mega-port — largest in Middle East",
  },
  {
    id: "port-fujairah",
    name: "PORT OF FUJAIRAH",
    type: "port",
    positions: [[56.36, 25.13]],
    color: "#00aaff",
    description: "Key bunkering port outside the Strait",
  },
  {
    id: "muscat",
    name: "PORT SULTAN QABOOS",
    type: "port",
    positions: [[58.57, 23.63]],
    color: "#00aaff",
    description: "Oman — Royal Navy of Oman HQ",
  },
];

export function ChokepointLayer({ viewer }: Props) {
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("chokepoints");
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    for (const cp of HORMUZ_DATA) {
      if (cp.type === "lane") {
        // Polyline for shipping lanes
        ds.entities.add({
          id: `cp-${cp.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(
              cp.positions.flatMap(([lon, lat]) => [lon, lat])
            ),
            width: 8,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString(cp.color.slice(0, 7)).withAlpha(0.5),
              dashLength: 16,
            }),
            clampToGround: true,
          },
          label: {
            text: cp.name,
            font: "9px monospace",
            fillColor: Cesium.Color.fromCssColorString(cp.color.slice(0, 7)).withAlpha(0.7),
            style: Cesium.LabelStyle.FILL,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#001100").withAlpha(0.7),
            backgroundPadding: new Cesium.Cartesian2(4, 2),
          },
          position: Cesium.Cartesian3.fromDegrees(
            cp.positions[Math.floor(cp.positions.length / 2)][0],
            cp.positions[Math.floor(cp.positions.length / 2)][1]
          ),
          properties: {
            type: "chokepoint",
            name: cp.name,
            description: cp.description,
          } as unknown as Cesium.PropertyBag,
        });
      } else if (cp.type === "zone") {
        // Polygon for zones
        ds.entities.add({
          id: `cp-${cp.id}`,
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(
              cp.positions.flatMap(([lon, lat]) => [lon, lat])
            ),
            material: Cesium.Color.fromCssColorString(cp.color.slice(0, 7)).withAlpha(0.12),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(cp.color.slice(0, 7)).withAlpha(0.4),
            outlineWidth: 1,
          },
          label: {
            text: cp.name,
            font: "8px monospace",
            fillColor: Cesium.Color.fromCssColorString(cp.color.slice(0, 7)).withAlpha(0.6),
            style: Cesium.LabelStyle.FILL,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_500_000),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#001100").withAlpha(0.7),
            backgroundPadding: new Cesium.Cartesian2(3, 2),
          },
          position: Cesium.Cartesian3.fromDegrees(
            cp.positions.reduce((sum, p) => sum + p[0], 0) / cp.positions.length,
            cp.positions.reduce((sum, p) => sum + p[1], 0) / cp.positions.length
          ),
          properties: {
            type: "chokepoint",
            name: cp.name,
            description: cp.description,
          } as unknown as Cesium.PropertyBag,
        });
      } else if (cp.type === "base" || cp.type === "port") {
        // Point for bases and ports
        const isBase = cp.type === "base";
        ds.entities.add({
          id: `cp-${cp.id}`,
          position: Cesium.Cartesian3.fromDegrees(cp.positions[0][0], cp.positions[0][1]),
          point: {
            pixelSize: isBase ? 6 : 5,
            color: Cesium.Color.fromCssColorString(cp.color),
            outlineColor: Cesium.Color.fromCssColorString(cp.color).withAlpha(0.3),
            outlineWidth: isBase ? 4 : 3,
          },
          label: {
            text: cp.name,
            font: `${isBase ? "9" : "8"}px monospace`,
            fillColor: Cesium.Color.fromCssColorString(cp.color).withAlpha(0.8),
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(8, -4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_500_000),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#001100").withAlpha(0.85),
            backgroundPadding: new Cesium.Cartesian2(4, 2),
          },
          properties: {
            type: cp.type,
            name: cp.name,
            description: cp.description,
          } as unknown as Cesium.PropertyBag,
        });
      }
    }

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    };
  }, [viewer]);

  return null;
}

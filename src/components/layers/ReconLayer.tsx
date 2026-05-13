"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { RECON_SITES, getCategoryMeta } from "@/lib/recon-sites";
import { reconIcon } from "@/lib/entity-icons";

interface Props {
  viewer: Cesium.Viewer;
}

/**
 * ReconLayer — plots OSINT areas of interest on the globe.
 * Each site is a crosshair marker colored by category.
 * Clicking a site opens the ReconPopup with satellite imagery.
 */
export function ReconLayer({ viewer }: Props) {
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("recon");
    viewer.dataSources.add(ds);
    dataSourceRef.current = ds;

    const icon = reconIcon(28);

    for (const site of RECON_SITES) {
      const meta = getCategoryMeta(site.category);
      const color = Cesium.Color.fromCssColorString(meta.color);

      ds.entities.add({
        id: `recon-${site.id}`,
        position: Cesium.Cartesian3.fromDegrees(
          site.longitude,
          site.latitude,
          0
        ),
        billboard: {
          image: icon,
          scale: 0.9,
          color: color.withAlpha(0.85),
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.4, 5e7, 0.3),
        },
        label: {
          text: site.name,
          font: "10px monospace",
          fillColor: color.withAlpha(0.9),
          style: Cesium.LabelStyle.FILL,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 14),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            2_000_000
          ),
          scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 2e6, 0.5),
          translucencyByDistance: new Cesium.NearFarScalar(
            2e5,
            1.0,
            2e6,
            0.3
          ),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.6),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
        },
        properties: {
          type: "recon",
          siteId: site.id,
          name: site.name,
          category: site.category,
          description: site.description,
          significance: site.significance,
          country: site.country,
          countryCode: site.countryCode,
          zoomAlt: site.zoomAlt,
        } as unknown as Cesium.PropertyBag,
      });
    }

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
    };
  }, [viewer]);

  return null;
}

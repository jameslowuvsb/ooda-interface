"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { useOODAStore } from "@/stores/ooda-store";
import { useNews } from "@/hooks/useNews";

interface Props {
  viewer: Cesium.Viewer;
}

/**
 * NewsLayer — renders geocoded news events on the globe
 * Uses pulsing diamond markers with tone-based coloring:
 *   - Negative tone (< -2): red (conflict/crisis)
 *   - Neutral tone (-2 to 2): amber
 *   - Positive tone (> 2): cyan
 */
export function NewsLayer({ viewer }: Props) {
  useNews();
  const news = useOODAStore((s) => s.news);
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    const ds = new Cesium.CustomDataSource("news");
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

    for (const article of news) {
      // Color based on sentiment tone
      let color: Cesium.Color;
      let outlineColor: Cesium.Color;
      if (article.tone < -2) {
        color = Cesium.Color.fromCssColorString("#ff4444"); // negative/conflict
        outlineColor = Cesium.Color.fromCssColorString("#ff4444").withAlpha(0.3);
      } else if (article.tone > 2) {
        color = Cesium.Color.fromCssColorString("#00cccc"); // positive
        outlineColor = Cesium.Color.fromCssColorString("#00cccc").withAlpha(0.3);
      } else {
        color = Cesium.Color.fromCssColorString("#ffaa00"); // neutral/amber
        outlineColor = Cesium.Color.fromCssColorString("#ffaa00").withAlpha(0.3);
      }

      // Truncate title for label
      const shortTitle =
        article.title.length > 40
          ? article.title.slice(0, 37) + "..."
          : article.title;

      ds.entities.add({
        id: `news-${article.id}`,
        position: Cesium.Cartesian3.fromDegrees(
          article.longitude,
          article.latitude,
          0
        ),
        point: {
          pixelSize: 7,
          color,
          outlineColor,
          outlineWidth: 3,
        },
        label: {
          text: `[${article.source}] ${shortTitle}`,
          font: "9px monospace",
          fillColor: color,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -12),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            3_000_000
          ),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("#001100").withAlpha(
            0.85
          ),
          backgroundPadding: new Cesium.Cartesian2(4, 2),
        },
        properties: {
          type: "news",
          title: article.title,
          source: article.source,
          url: article.url,
          tone: article.tone,
          date: article.date,
          imageUrl: article.imageUrl || "",
        } as unknown as Cesium.PropertyBag,
      });
    }
  }, [news]);

  return null;
}

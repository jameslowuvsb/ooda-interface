"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { initCesium, createDarkImageryProvider, viewerOptions } from "@/lib/cesium-config";
import { useOODAStore } from "@/stores/ooda-store";
import { FlightLayer } from "@/components/layers/FlightLayer";
import { SatelliteLayer } from "@/components/layers/SatelliteLayer";
import { EarthquakeLayer } from "@/components/layers/EarthquakeLayer";
import { VesselLayer } from "@/components/layers/VesselLayer";
import { NewsLayer } from "@/components/layers/NewsLayer";
import { ChokepointLayer } from "@/components/layers/ChokepointLayer";
import { WeatherLayer } from "@/components/layers/WeatherLayer";
import { AlertLayer } from "@/components/layers/AlertLayer";
import { ReconLayer } from "@/components/layers/ReconLayer";
import { GeoLabelsLayer } from "@/components/layers/GeoLabelsLayer";

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const setViewer = useOODAStore((s) => s.setViewer);
  const setCursorPosition = useOODAStore((s) => s.setCursorPosition);
  const setSelectedEntity = useOODAStore((s) => s.setSelectedEntity);
  const layers = useOODAStore((s) => s.layers);

  useEffect(() => {
    if (!containerRef.current) return;
    // Prevent double-init from React Strict Mode
    if (viewerRef.current && !viewerRef.current.isDestroyed()) return;

    initCesium();

    const viewer = new Cesium.Viewer(containerRef.current, {
      ...viewerOptions,
      baseLayer: new Cesium.ImageryLayer(createDarkImageryProvider()),
    });

    // Add Cesium Ion world terrain for real 3D elevation
    Cesium.CesiumTerrainProvider.fromIonAssetId(1).then((terrain) => {
      if (!viewer.isDestroyed()) {
        viewer.terrainProvider = terrain;
      }
    }).catch(() => {});

    // Add Google 3D Photorealistic Tiles (buildings + detailed terrain)
    try {
      Cesium.createGooglePhotorealistic3DTileset().then((tileset) => {
        if (!viewer.isDestroyed()) {
          viewer.scene.primitives.add(tileset);
        }
      }).catch((err) => {
        console.warn("Google 3D Tiles unavailable:", err);
      });
    } catch (err) {
      console.warn("Google 3D Tiles failed to initialize:", err);
    }

    // Dark background for space
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#050a05");
    viewer.scene.globe.enableLighting = true;

    // Atmosphere — subtle green-tinted glow
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.hueShift = 0.3;
      viewer.scene.skyAtmosphere.saturationShift = -0.3;
      viewer.scene.skyAtmosphere.brightnessShift = -0.2;
    }

    // Globe rendering — show depth with shading
    viewer.scene.globe.showGroundAtmosphere = true;

    // Default view: Global overview
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // Track cursor position
    handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      const cartesian = viewer.camera.pickEllipsoid(
        movement.endPosition,
        viewer.scene.globe.ellipsoid
      );
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        setCursorPosition({
          lat: Cesium.Math.toDegrees(carto.latitude),
          lon: Cesium.Math.toDegrees(carto.longitude),
          alt: viewer.camera.positionCartographic.height,
        });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Click to select entity
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id) {
        const entity = picked.id as Cesium.Entity;
        const props = entity.properties;
        if (props) {
          const type = props.type?.getValue(Cesium.JulianDate.now()) || "unknown";
          const details: Record<string, string | number> = {};

          // Extract properties based on entity type
          const propNames = props.propertyNames || [];
          for (const name of propNames) {
            if (name === "type") continue;
            try {
              const val = props[name]?.getValue(Cesium.JulianDate.now());
              if (val !== undefined && val !== null && val !== "") {
                details[name] = val;
              }
            } catch {
              // skip unreadable props
            }
          }

          const position = entity.position?.getValue(Cesium.JulianDate.now());
          let lon = 0, lat = 0;
          if (position) {
            const carto = Cesium.Cartographic.fromCartesian(position);
            lon = Cesium.Math.toDegrees(carto.longitude);
            lat = Cesium.Math.toDegrees(carto.latitude);
          }

          setSelectedEntity({
            id: entity.id,
            type,
            name: String(
              details.callsign || details.name || details.vesselName || entity.id
            ),
            details,
            lon,
            lat,
          });
        }
      } else {
        // Click on empty space - deselect
        setSelectedEntity(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;
    setViewer(viewer);
    setViewerReady(true);

    return () => {
      setViewerReady(false);
      handler.destroy();
      if (!viewer.isDestroyed()) {
        // Stop the render loop before destroying
        viewer.useDefaultRenderLoop = false;
        try {
          viewer.destroy();
        } catch {
          // Suppress errors during cleanup
        }
      }
      viewerRef.current = null;
      setViewer(null);
    };
  }, [setViewer, setCursorPosition, setSelectedEntity]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {viewerReady && viewerRef.current && !viewerRef.current.isDestroyed() && (
        <>
          {layers.flights && <FlightLayer viewer={viewerRef.current} />}
          {layers.satellites && <SatelliteLayer viewer={viewerRef.current} />}
          {layers.earthquakes && <EarthquakeLayer viewer={viewerRef.current} />}
          {layers.vessels && <VesselLayer viewer={viewerRef.current} />}
          {layers.news && <NewsLayer viewer={viewerRef.current} />}
          {layers.weather && <WeatherLayer viewer={viewerRef.current} />}
          <ChokepointLayer viewer={viewerRef.current} />
          <AlertLayer viewer={viewerRef.current} />
          <ReconLayer viewer={viewerRef.current} />
          <GeoLabelsLayer viewer={viewerRef.current} />
        </>
      )}
    </div>
  );
}

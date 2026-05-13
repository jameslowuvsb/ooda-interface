/**
 * Tactical Entity Icons — Clean white silhouettes for CesiumJS color tinting
 *
 * All icons are drawn in WHITE. CesiumJS billboard `color` property tints them
 * to the desired entity color. This gives unlimited color variants from a single
 * texture per entity type.
 *
 * All icons face NORTH (up). CesiumJS billboard `rotation` handles heading.
 * Icons are rendered to Canvas and cached.
 *
 * Style: WorldView-inspired — clean, minimal, high-contrast silhouettes.
 */

const iconCache = new Map<string, HTMLCanvasElement>();

function getOrCreate(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): HTMLCanvasElement {
  if (iconCache.has(key)) return iconCache.get(key)!;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  iconCache.set(key, canvas);
  return canvas;
}

const WHITE = "#ffffff";

// ── AIRCRAFT ────────────────────────────────────────────

/**
 * Clean aircraft silhouette — swept wings, narrow fuselage.
 * Drawn white; CesiumJS billboard color tints it.
 */
export function aircraftIcon(size = 32): HTMLCanvasElement {
  return getOrCreate(`aircraft-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 32;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Fuselage
    ctx.beginPath();
    ctx.moveTo(0, -14);    // Nose
    ctx.lineTo(1.5, -8);
    ctx.lineTo(1.5, 6);
    ctx.lineTo(2.5, 10);
    ctx.lineTo(2.5, 13);
    ctx.lineTo(0, 11);
    ctx.lineTo(-2.5, 13);
    ctx.lineTo(-2.5, 10);
    ctx.lineTo(-1.5, 6);
    ctx.lineTo(-1.5, -8);
    ctx.closePath();
    ctx.fill();

    // Main wings (swept)
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(13, 5);
    ctx.lineTo(13, 7);
    ctx.lineTo(1.5, 3);
    ctx.lineTo(-1.5, 3);
    ctx.lineTo(-13, 7);
    ctx.lineTo(-13, 5);
    ctx.closePath();
    ctx.fill();

    // Tail stabilizers
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(5.5, 13);
    ctx.lineTo(5.5, 14);
    ctx.lineTo(0, 12);
    ctx.lineTo(-5.5, 14);
    ctx.lineTo(-5.5, 13);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });
}

/**
 * Helicopter — rotor disc + body
 */
export function helicopterIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`heli-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;
    ctx.strokeStyle = WHITE;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main rotor disc
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, -1, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Tail boom
    ctx.globalAlpha = 1;
    ctx.fillRect(-0.7, 6, 1.4, 6);

    // Tail rotor
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-3.5, 12);
    ctx.lineTo(3.5, 12);
    ctx.stroke();

    ctx.restore();
  });
}

// ── VESSELS ─────────────────────────────────────────────

/**
 * Ship hull — pointed bow, flat stern. Used as base for all vessel types.
 * WorldView style: 28x28, clean white pointed hull.
 */
export function shipIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`ship-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Hull — pointed bow, squared stern
    ctx.beginPath();
    ctx.moveTo(0, -12);     // Bow point
    ctx.lineTo(5, -4);
    ctx.lineTo(5, 9);
    ctx.lineTo(3, 12);      // Stern
    ctx.lineTo(-3, 12);
    ctx.lineTo(-5, 9);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });
}

/**
 * Tanker — wide beam, cargo section indicated
 */
export function tankerIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`tanker-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Wide hull
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5.5, -5);
    ctx.lineTo(6, 2);
    ctx.lineTo(6, 9);
    ctx.lineTo(4, 12);
    ctx.lineTo(-4, 12);
    ctx.lineTo(-6, 9);
    ctx.lineTo(-6, 2);
    ctx.lineTo(-5.5, -5);
    ctx.closePath();
    ctx.fill();

    // Tank section lines (dark subtraction)
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.5;
    for (let y = -4; y <= 6; y += 3.5) {
      ctx.beginPath();
      ctx.moveTo(-4, y);
      ctx.lineTo(4, y);
      ctx.stroke();
    }

    // Bridge block (stern)
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(-2.5, 8, 5, 3);

    ctx.restore();
  });
}

/**
 * Cargo — angular hull with container grid
 */
export function cargoIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`cargo-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Angular hull
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5, -4);
    ctx.lineTo(5, 9);
    ctx.lineTo(3, 12);
    ctx.lineTo(-3, 12);
    ctx.lineTo(-5, 9);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();

    // Container grid (dark subtraction)
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let row = -3; row <= 5; row += 3) {
      for (let col = -3; col <= 1; col += 2.8) {
        ctx.fillRect(col, row, 2.2, 2.2);
      }
    }

    // Bridge
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(-2, 7, 4, 4);

    ctx.restore();
  });
}

/**
 * Military — sleek narrow hull
 */
export function militaryVesselIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`military-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Sleek hull
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(3, -6);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(3.5, 7);
    ctx.lineTo(2, 12);
    ctx.lineTo(-2, 12);
    ctx.lineTo(-3.5, 7);
    ctx.lineTo(-3.5, 0);
    ctx.lineTo(-3, -6);
    ctx.closePath();
    ctx.fill();

    // Superstructure (dark subtraction)
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(-2, -2, 4, 6);

    ctx.restore();
  });
}

/**
 * Passenger — wide rounded hull
 */
export function passengerIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`passenger-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Rounded hull
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.quadraticCurveTo(6, -4, 6, 2);
    ctx.lineTo(6, 7);
    ctx.quadraticCurveTo(6, 12, 0, 12);
    ctx.quadraticCurveTo(-6, 12, -6, 7);
    ctx.lineTo(-6, 2);
    ctx.quadraticCurveTo(-6, -4, 0, -11);
    ctx.closePath();
    ctx.fill();

    // Deck lines
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.5;
    for (let y = -4; y <= 8; y += 3) {
      ctx.beginPath();
      ctx.moveTo(-4, y);
      ctx.lineTo(4, y);
      ctx.stroke();
    }

    ctx.restore();
  });
}

/**
 * Fishing — small boat with outriggers
 */
export function fishingIcon(size = 24): HTMLCanvasElement {
  return getOrCreate(`fishing-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 24;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Small hull
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(3, -3);
    ctx.lineTo(3, 5);
    ctx.lineTo(1.5, 8);
    ctx.lineTo(-1.5, 8);
    ctx.lineTo(-3, 5);
    ctx.lineTo(-3, -3);
    ctx.closePath();
    ctx.fill();

    // Outrigger booms
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(7, -5);
    ctx.moveTo(0, -1);
    ctx.lineTo(-7, -5);
    ctx.stroke();

    ctx.restore();
  });
}

/**
 * Tug — compact, stubby
 */
export function tugIcon(size = 22): HTMLCanvasElement {
  return getOrCreate(`tug-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 22;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(3.5, -1);
    ctx.lineTo(3.5, 5);
    ctx.lineTo(2, 7);
    ctx.lineTo(-2, 7);
    ctx.lineTo(-3.5, 5);
    ctx.lineTo(-3.5, -1);
    ctx.closePath();
    ctx.fill();

    // Wheelhouse
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(-2, 0, 4, 3);

    ctx.restore();
  });
}

/**
 * Generic vessel — simple hull
 */
export function genericVesselIcon(size = 24): HTMLCanvasElement {
  return getOrCreate(`vessel-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 24;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 6);
    ctx.lineTo(2, 9);
    ctx.lineTo(-2, 9);
    ctx.lineTo(-4, 6);
    ctx.lineTo(-4, -3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });
}

/**
 * Get the vessel icon canvas for a ship type.
 * All icons are white — CesiumJS billboard `color` tints them.
 */
export function getVesselIcon(shipType: string): HTMLCanvasElement {
  switch (shipType) {
    case "Tanker": return tankerIcon();
    case "Cargo": return cargoIcon();
    case "Military": return militaryVesselIcon();
    case "Passenger": return passengerIcon();
    case "Fishing": return fishingIcon();
    case "Tug": return tugIcon();
    case "HSC": return militaryVesselIcon();
    case "Law Enforcement": return militaryVesselIcon();
    default: return genericVesselIcon();
  }
}

// ── SATELLITES ──────────────────────────────────────────

/**
 * Satellite — body + solar panels
 */
export function satelliteIcon(size = 24): HTMLCanvasElement {
  return getOrCreate(`satellite-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 24;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Solar panels
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-11, -3, 7, 6);
    ctx.fillRect(4, -3, 7, 6);

    // Panel grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.4;
    ctx.strokeRect(-11, -3, 3.5, 3);
    ctx.strokeRect(-7.5, -3, 3.5, 3);
    ctx.strokeRect(-11, 0, 3.5, 3);
    ctx.strokeRect(-7.5, 0, 3.5, 3);
    ctx.strokeRect(4, -3, 3.5, 3);
    ctx.strokeRect(7.5, -3, 3.5, 3);
    ctx.strokeRect(4, 0, 3.5, 3);
    ctx.strokeRect(7.5, 0, 3.5, 3);

    // Body
    ctx.globalAlpha = 1;
    ctx.fillRect(-3.5, -3.5, 7, 7);

    // Antenna
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(0, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8, 1.5, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  });
}

/**
 * Space station — truss + solar arrays
 */
export function stationIcon(size = 32): HTMLCanvasElement {
  return getOrCreate(`station-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 32;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = WHITE;

    // Main truss
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-14, -0.8, 28, 1.6);

    // Solar arrays (4 pairs)
    ctx.globalAlpha = 0.7;
    for (const x of [-12, -7, 7, 12]) {
      ctx.fillRect(x - 1.8, -6, 3.6, 5);
      ctx.fillRect(x - 1.8, 1, 3.6, 5);
    }

    // Habitat modules
    ctx.globalAlpha = 1;
    ctx.fillRect(-3.5, -2.5, 7, 5);

    // Docking ports
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-1.5, -4, 3, 1.5);
    ctx.fillRect(-1.5, 2.5, 3, 1.5);

    ctx.restore();
  });
}

/**
 * Get satellite icon based on name/category.
 * All white — CesiumJS tints via billboard color.
 */
export function getSatelliteIcon(name: string, category: string): HTMLCanvasElement {
  const lower = name.toLowerCase();
  if (lower.includes("iss") || lower.includes("zarya") || lower.includes("station") || category === "station") {
    return stationIcon();
  }
  return satelliteIcon();
}

// ── RECON / AREA OF INTEREST ──────────────────────────────

/**
 * Recon target — crosshair/target sight icon for OSINT areas of interest.
 */
export function reconIcon(size = 28): HTMLCanvasElement {
  return getOrCreate(`recon-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 28;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.strokeStyle = WHITE;
    ctx.fillStyle = WHITE;

    // Outer ring
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair lines — extending beyond outer ring
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 0.8;
    // Top
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(0, -7);
    ctx.stroke();
    // Bottom
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(0, 13);
    ctx.stroke();
    // Left
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-7, 0);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(13, 0);
    ctx.stroke();

    // Center dot
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

// ── ANCHORED VESSEL ─────────────────────────────────────

/**
 * Anchored vessel — circle with anchor symbol
 */
export function anchoredIcon(size = 18): HTMLCanvasElement {
  return getOrCreate(`anchored-${size}`, size, (ctx, s) => {
    const cx = s / 2;
    const cy = s / 2;
    const scale = s / 18;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.strokeStyle = WHITE;
    ctx.fillStyle = WHITE;

    // Circle
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Anchor
    ctx.globalAlpha = 0.8;
    ctx.fillRect(-0.5, -4, 1, 7);
    ctx.fillRect(-2.5, -2.5, 5, 0.8);
    ctx.beginPath();
    ctx.arc(0, -4.5, 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, 2.5);
    ctx.lineTo(0, 1);
    ctx.lineTo(3, 2.5);
    ctx.stroke();

    ctx.restore();
  });
}

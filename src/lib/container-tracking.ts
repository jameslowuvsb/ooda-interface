/**
 * Container Number Tracking
 *
 * ISO 6346 container number format:
 *   ABCU 1234567
 *   ^^^^ ^^^^^^^
 *   |||  └── 6 digits + 1 check digit
 *   ||└── Equipment category (U=freight, J=detachable, Z=trailer)
 *   └──── Owner code (3 letters identifying shipping line)
 *
 * Tracking flow:
 * 1. Parse & validate the container number
 * 2. Identify the shipping line from owner code prefix
 * 3. Query external tracking API if key available
 * 4. Cross-reference with AIS vessel data (match shipping line → vessels)
 * 5. Return location result
 */

// ── Owner Code → Shipping Line Mapping ─────────────────────

export interface ShippingLine {
  code: string;
  name: string;
  scac: string;           // Standard Carrier Alpha Code (for API lookups)
  vesselPrefix: string[]; // Common vessel name prefixes for AIS matching
}

const OWNER_CODES: Record<string, ShippingLine> = {
  // Maersk
  MAE: { code: "MAE", name: "Maersk", scac: "MAEU", vesselPrefix: ["MAERSK", "EMMA MAERSK", "EUGEN MAERSK", "ESTELLE MAERSK"] },
  MRS: { code: "MRS", name: "Maersk", scac: "MAEU", vesselPrefix: ["MAERSK"] },
  MRK: { code: "MRK", name: "Maersk", scac: "MAEU", vesselPrefix: ["MAERSK"] },
  // MSC
  MSC: { code: "MSC", name: "MSC", scac: "MSCU", vesselPrefix: ["MSC"] },
  MEL: { code: "MEL", name: "MSC", scac: "MSCU", vesselPrefix: ["MSC"] },
  // CMA CGM
  CMA: { code: "CMA", name: "CMA CGM", scac: "CMDU", vesselPrefix: ["CMA CGM", "CMA-CGM"] },
  CGM: { code: "CGM", name: "CMA CGM", scac: "CMDU", vesselPrefix: ["CMA CGM"] },
  // Hapag-Lloyd
  HLC: { code: "HLC", name: "Hapag-Lloyd", scac: "HLCU", vesselPrefix: ["HAPAG"] },
  HLX: { code: "HLX", name: "Hapag-Lloyd", scac: "HLCU", vesselPrefix: ["HAPAG"] },
  // COSCO
  COS: { code: "COS", name: "COSCO", scac: "COSU", vesselPrefix: ["COSCO"] },
  CBH: { code: "CBH", name: "COSCO", scac: "COSU", vesselPrefix: ["COSCO"] },
  // Evergreen (prefixes: EITU, EISU, EMCU, EGHU, EGSU, HMCU, IMTU, LTIU, UGMU)
  EIT: { code: "EIT", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  EIS: { code: "EIS", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  EGH: { code: "EGH", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  EGS: { code: "EGS", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  EGL: { code: "EGL", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  EMC: { code: "EMC", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  HMC: { code: "HMC", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  IMT: { code: "IMT", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  LTI: { code: "LTI", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  UGM: { code: "UGM", name: "Evergreen", scac: "EGLV", vesselPrefix: ["EVER"] },
  // ONE (Ocean Network Express)
  ONE: { code: "ONE", name: "ONE", scac: "ONEY", vesselPrefix: ["ONE"] },
  NYK: { code: "NYK", name: "ONE (NYK)", scac: "ONEY", vesselPrefix: ["NYK"] },
  MOL: { code: "MOL", name: "ONE (MOL)", scac: "ONEY", vesselPrefix: ["MOL"] },
  // HMM (Hyundai)
  HMM: { code: "HMM", name: "HMM", scac: "HDMU", vesselPrefix: ["HMM", "HYUNDAI"] },
  HDM: { code: "HDM", name: "HMM", scac: "HDMU", vesselPrefix: ["HMM", "HYUNDAI"] },
  // Yang Ming
  YML: { code: "YML", name: "Yang Ming", scac: "YMLU", vesselPrefix: ["YM "] },
  // ZIM
  ZIM: { code: "ZIM", name: "ZIM", scac: "ZIMU", vesselPrefix: ["ZIM"] },
  // PIL (Pacific Int'l Lines)
  PIL: { code: "PIL", name: "PIL", scac: "PILU", vesselPrefix: ["KOTA"] },
  // WHL (Wan Hai Lines)
  WHL: { code: "WHL", name: "Wan Hai", scac: "WHLC", vesselPrefix: ["WAN HAI"] },
  // OOCL
  OOL: { code: "OOL", name: "OOCL", scac: "OOLU", vesselPrefix: ["OOCL"] },
  OOC: { code: "OOC", name: "OOCL", scac: "OOLU", vesselPrefix: ["OOCL"] },
  // Triton (leasing)
  TRI: { code: "TRI", name: "Triton (Leasing)", scac: "", vesselPrefix: [] },
  // Textainer (leasing)
  TEX: { code: "TEX", name: "Textainer (Leasing)", scac: "", vesselPrefix: [] },
  // Beacon (leasing)
  BIC: { code: "BIC", name: "Beacon (Leasing)", scac: "", vesselPrefix: [] },
  // SeaCube (leasing)
  SCL: { code: "SCL", name: "SeaCube (Leasing)", scac: "", vesselPrefix: [] },
  // Florens (leasing)
  FLC: { code: "FLC", name: "Florens (Leasing)", scac: "", vesselPrefix: [] },
};

// ── Container Number Parsing ───────────────────────────────

export interface ParsedContainer {
  raw: string;
  normalized: string;   // Uppercase, spaces removed
  ownerCode: string;     // First 3 letters
  equipmentCat: string;  // 4th letter
  serial: string;        // 6 digits
  checkDigit: string;    // 1 digit
  valid: boolean;
  shippingLine: ShippingLine | null;
}

/**
 * Parse and validate an ISO 6346 container number.
 */
export function parseContainerNumber(input: string): ParsedContainer {
  const normalized = input.toUpperCase().replace(/[\s\-_.]/g, "");

  const match = normalized.match(/^([A-Z]{3})([UJZR])(\d{6})(\d)$/);

  if (!match) {
    return {
      raw: input,
      normalized,
      ownerCode: normalized.slice(0, 3),
      equipmentCat: normalized[3] || "",
      serial: normalized.slice(4, 10),
      checkDigit: normalized[10] || "",
      valid: false,
      shippingLine: OWNER_CODES[normalized.slice(0, 3)] || null,
    };
  }

  const [, ownerCode, equipmentCat, serial, checkDigit] = match;
  const shippingLine = OWNER_CODES[ownerCode] || null;

  // Validate check digit (ISO 6346 algorithm)
  const valid = validateCheckDigit(ownerCode + equipmentCat + serial + checkDigit);

  return {
    raw: input,
    normalized,
    ownerCode,
    equipmentCat,
    serial,
    checkDigit,
    valid,
    shippingLine,
  };
}

function validateCheckDigit(num: string): boolean {
  // ISO 6346 check digit calculation
  const charValues: Record<string, number> = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((c, i) => {
    // Skip multiples of 11: A=10, B=12, C=13, ... (gap at 11, 22, 33)
    let val = i + 10;
    val += Math.floor((val - 10) / 10); // Skip multiples of 11
    charValues[c] = val;
  });
  "0123456789".split("").forEach((c, i) => {
    charValues[c] = i;
  });

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const val = charValues[num[i]] ?? 0;
    sum += val * Math.pow(2, i);
  }

  const remainder = sum % 11;
  const expected = remainder === 10 ? 0 : remainder;
  return expected === parseInt(num[10]);
}

// ── Container Tracking Result ──────────────────────────────

export interface ContainerLocation {
  status: "on_vessel" | "at_port" | "in_transit" | "unknown";
  vesselName: string | null;
  vesselMmsi: string | null;
  portName: string | null;
  latitude: number | null;
  longitude: number | null;
  lastEvent: string;
  lastEventTime: string | null;
  shippingLine: string;
  containerNumber: string;
  source: "api" | "ais_match" | "schedule";
  confidence: number; // 0-1
}

/**
 * Search AIS vessel data for vessels matching a shipping line.
 * Returns vessels whose names match the line's known prefixes.
 */
export function matchVesselsForLine(
  vesselNames: { name: string; mmsi: string; lat: number; lon: number; speed: number; destination: string }[],
  line: ShippingLine
): { name: string; mmsi: string; lat: number; lon: number; speed: number; destination: string }[] {
  if (line.vesselPrefix.length === 0) return [];

  return vesselNames.filter((v) => {
    const upper = v.name.toUpperCase();
    return line.vesselPrefix.some((prefix) => upper.includes(prefix));
  });
}

/**
 * Get all known shipping line codes for display.
 */
export function getShippingLines(): { code: string; name: string }[] {
  const seen = new Set<string>();
  const result: { code: string; name: string }[] = [];
  for (const [code, line] of Object.entries(OWNER_CODES)) {
    if (!seen.has(line.name)) {
      seen.add(line.name);
      result.push({ code, name: line.name });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

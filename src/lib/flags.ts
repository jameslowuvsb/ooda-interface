/**
 * Country flag utilities — converts ISO codes and country names to flag emojis.
 *
 * Supports:
 * - ISO 3166-1 alpha-2 codes (US, GB, CN, etc.) → 🇺🇸 🇬🇧 🇨🇳
 * - Full country names ("United States", "China") → mapped to alpha-2 → emoji
 * - Ship registry flags (PA, LR, MH, etc.)
 * - Satellite operating countries
 */

/**
 * Convert a 2-letter ISO country code to its flag emoji.
 * Works by converting each letter to a Regional Indicator Symbol.
 */
export function codeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const cp1 = 0x1f1e6 + (upper.charCodeAt(0) - 65);
  const cp2 = 0x1f1e6 + (upper.charCodeAt(1) - 65);
  return String.fromCodePoint(cp1, cp2);
}

/**
 * Map full country names (as returned by ADS-B / airplanes.live) to ISO alpha-2.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "afghanistan": "AF", "albania": "AL", "algeria": "DZ", "argentina": "AR",
  "armenia": "AM", "australia": "AU", "austria": "AT", "azerbaijan": "AZ",
  "bahamas": "BS", "bahrain": "BH", "bangladesh": "BD", "barbados": "BB",
  "belarus": "BY", "belgium": "BE", "bermuda": "BM", "bolivia": "BO",
  "brazil": "BR", "brunei": "BN", "bulgaria": "BG", "cambodia": "KH",
  "cameroon": "CM", "canada": "CA", "cayman islands": "KY", "chile": "CL",
  "china": "CN", "colombia": "CO", "costa rica": "CR", "croatia": "HR",
  "cuba": "CU", "cyprus": "CY", "czech republic": "CZ", "czechia": "CZ",
  "denmark": "DK", "dominican republic": "DO", "ecuador": "EC",
  "egypt": "EG", "el salvador": "SV", "estonia": "EE", "ethiopia": "ET",
  "fiji": "FJ", "finland": "FI", "france": "FR", "georgia": "GE",
  "germany": "DE", "ghana": "GH", "greece": "GR", "guatemala": "GT",
  "hong kong": "HK", "hungary": "HU", "iceland": "IS", "india": "IN",
  "indonesia": "ID", "iran": "IR", "iraq": "IQ", "ireland": "IE",
  "isle of man": "IM", "israel": "IL", "italy": "IT", "jamaica": "JM",
  "japan": "JP", "jordan": "JO", "kazakhstan": "KZ", "kenya": "KE",
  "korea": "KR", "south korea": "KR", "republic of korea": "KR",
  "north korea": "KP", "kuwait": "KW", "kyrgyzstan": "KG",
  "laos": "LA", "latvia": "LV", "lebanon": "LB", "libya": "LY",
  "liechtenstein": "LI", "lithuania": "LT", "luxembourg": "LU",
  "macao": "MO", "macau": "MO", "malaysia": "MY", "maldives": "MV",
  "malta": "MT", "marshall islands": "MH", "mauritius": "MU",
  "mexico": "MX", "moldova": "MD", "monaco": "MC", "mongolia": "MN",
  "montenegro": "ME", "morocco": "MA", "mozambique": "MZ", "myanmar": "MM",
  "namibia": "NA", "nepal": "NP", "netherlands": "NL", "new zealand": "NZ",
  "nicaragua": "NI", "nigeria": "NG", "norway": "NO", "oman": "OM",
  "pakistan": "PK", "panama": "PA", "papua new guinea": "PG",
  "paraguay": "PY", "peru": "PE", "philippines": "PH", "poland": "PL",
  "portugal": "PT", "qatar": "QA", "romania": "RO",
  "russia": "RU", "russian federation": "RU",
  "saudi arabia": "SA", "senegal": "SN", "serbia": "RS",
  "singapore": "SG", "slovakia": "SK", "slovenia": "SI",
  "south africa": "ZA", "spain": "ES", "sri lanka": "LK",
  "sweden": "SE", "switzerland": "CH", "syria": "SY",
  "taiwan": "TW", "tanzania": "TZ", "thailand": "TH",
  "trinidad and tobago": "TT", "tunisia": "TN", "turkey": "TR",
  "turkmenistan": "TM", "uganda": "UG", "ukraine": "UA",
  "united arab emirates": "AE", "united kingdom": "GB",
  "united states": "US", "uruguay": "UY", "uzbekistan": "UZ",
  "venezuela": "VE", "vietnam": "VN", "yemen": "YE",
  "zambia": "ZM", "zimbabwe": "ZW",
  // Common variations in ADS-B data
  "liberia": "LR", "bermuda (uk)": "BM", "guernsey": "GG",
  "jersey": "JE", "curacao": "CW",
};

/**
 * Get a flag emoji from a country name or ISO code.
 * Handles both "United States" and "US" style inputs.
 */
export function getFlag(countryOrCode: string): string {
  if (!countryOrCode) return "";

  const trimmed = countryOrCode.trim();

  // If it's already a 2-letter code
  if (trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed)) {
    return codeToFlag(trimmed);
  }

  // Look up by name
  const code = COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()];
  if (code) return codeToFlag(code);

  return "";
}

/**
 * Get both the flag emoji and the ISO code from a country name or code.
 */
export function getFlagAndCode(countryOrCode: string): { flag: string; code: string } {
  if (!countryOrCode) return { flag: "", code: "" };

  const trimmed = countryOrCode.trim();

  if (trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed)) {
    return { flag: codeToFlag(trimmed), code: trimmed.toUpperCase() };
  }

  const code = COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()];
  if (code) return { flag: codeToFlag(code), code };

  return { flag: "", code: "" };
}

/**
 * Map satellite names/series to operating country codes.
 * Based on NORAD catalog conventions and known satellite programs.
 */
const SAT_COUNTRY_PATTERNS: [RegExp, string][] = [
  // USA
  [/^ISS/i, "US"],
  [/^TDRS/i, "US"],
  [/^GPS/i, "US"],
  [/^GOES/i, "US"],
  [/^NOAA/i, "US"],
  [/^LANDSAT/i, "US"],
  [/^TERRA$/i, "US"],
  [/^AQUA$/i, "US"],
  [/^AURA$/i, "US"],
  [/HUBBLE/i, "US"],
  [/^STARLINK/i, "US"],
  [/^CYGNUS/i, "US"],
  [/^CREW DRAGON/i, "US"],
  [/^STARLINER/i, "US"],
  [/^NROL/i, "US"],
  [/^USA[- ]/i, "US"],
  [/^ATLAS/i, "US"],
  [/^FALCON/i, "US"],

  // China
  [/^CSS/i, "CN"],
  [/^TIANHE/i, "CN"],
  [/^TIANGONG/i, "CN"],
  [/^TIANZHOU/i, "CN"],
  [/^SHENZHOU/i, "CN"],
  [/^FENGYUN/i, "CN"],
  [/^BEIDOU/i, "CN"],
  [/^YAOGAN/i, "CN"],
  [/^CHANG'?E/i, "CN"],
  [/^SZ-/i, "CN"],
  [/^CZ-/i, "CN"],

  // Russia
  [/^SOYUZ/i, "RU"],
  [/^PROGRESS/i, "RU"],
  [/^COSMOS/i, "RU"],
  [/^KOSMOS/i, "RU"],
  [/^GLONASS/i, "RU"],
  [/^POISK/i, "RU"],
  [/^NAUKA/i, "RU"],
  [/^FREGAT/i, "RU"],
  [/^PRICHAL/i, "RU"],
  [/^RASSVET/i, "RU"],
  [/^ZVEZDA/i, "RU"],
  [/^ZARYA/i, "RU"],

  // ESA / Europe
  [/^GALILEO/i, "EU"],
  [/^SENTINEL/i, "EU"],
  [/^METEOSAT/i, "EU"],
  [/^AEOLUS/i, "EU"],
  [/^COLUMBUS/i, "EU"],
  [/^ATV/i, "EU"],

  // Japan
  [/^HTV/i, "JP"],
  [/^KIBO/i, "JP"],
  [/^QZSS/i, "JP"],
  [/^HIMAWARI/i, "JP"],
  [/^ALOS/i, "JP"],
  [/^HAYABUSA/i, "JP"],

  // India
  [/^NAVIC/i, "IN"],
  [/^IRNSS/i, "IN"],
  [/^CARTOSAT/i, "IN"],
  [/^INSAT/i, "IN"],
  [/^GSAT/i, "IN"],
  [/^CHANDRAYAAN/i, "IN"],

  // Canada
  [/^CANADARM/i, "CA"],
  [/^RADARSAT/i, "CA"],

  // South Korea
  [/^KOMPSAT/i, "KR"],
  [/^NURI/i, "KR"],

  // Israel
  [/^AMOS/i, "IL"],
  [/^EROS/i, "IL"],
  [/^OFEQ/i, "IL"],

  // UK
  [/^ONEWEB/i, "GB"],
  [/^INMARSAT/i, "GB"],

  // International
  [/^IRIDIUM/i, "US"],
  [/^GLOBALSTAR/i, "US"],
  [/^ORBCOMM/i, "US"],
  [/^SPACEBEE/i, "US"],
  [/^LEMUR/i, "US"],
];

/**
 * Guess the operating country of a satellite from its name.
 * Returns ISO 2-letter code or empty string.
 */
export function getSatelliteCountry(name: string): string {
  if (!name) return "";
  for (const [pattern, code] of SAT_COUNTRY_PATTERNS) {
    if (pattern.test(name)) return code;
  }
  return "";
}

/**
 * OSINT Areas of Interest — Curated list of strategically significant locations
 * for satellite imagery reconnaissance.
 *
 * Categories:
 * - nuclear: Nuclear facilities under monitoring or proliferation concern
 * - military: Major naval/air bases of strategic importance
 * - conflict: Active conflict zones or recent military activity
 * - infrastructure: Critical economic/energy infrastructure
 * - disputed: Contested territories and artificial island construction
 */

export interface ReconSite {
  id: string;
  name: string;
  category: "nuclear" | "military" | "conflict" | "infrastructure" | "disputed";
  description: string;
  significance: string;
  latitude: number;
  longitude: number;
  zoomAlt: number; // flyTo altitude in meters
  country: string;
  countryCode: string;
}

const CATEGORY_META: Record<
  ReconSite["category"],
  { label: string; color: string }
> = {
  nuclear: { label: "NUCLEAR", color: "#ffff00" },
  military: { label: "MILITARY", color: "#ff00ff" },
  conflict: { label: "CONFLICT", color: "#ff3333" },
  infrastructure: { label: "INFRASTRUCTURE", color: "#00aaff" },
  disputed: { label: "DISPUTED", color: "#ff8800" },
};

export function getCategoryMeta(cat: ReconSite["category"]) {
  return CATEGORY_META[cat];
}

export const RECON_SITES: ReconSite[] = [
  // ── Nuclear Facilities ──────────────────────────────
  {
    id: "natanz",
    name: "Natanz Enrichment Facility",
    category: "nuclear",
    description: "Iran's primary uranium enrichment site. Underground centrifuge halls hardened against airstrikes.",
    significance: "IAEA monitoring — advanced centrifuge deployment detected via satellite imagery changes in building footprints.",
    latitude: 33.724,
    longitude: 51.727,
    zoomAlt: 8000,
    country: "Iran",
    countryCode: "IR",
  },
  {
    id: "fordow",
    name: "Fordow Enrichment Plant",
    category: "nuclear",
    description: "Underground enrichment facility built inside a mountain near Qom.",
    significance: "Hardened site — satellite imagery tracks surface activity, vehicle patterns, and ventilation signatures.",
    latitude: 34.884,
    longitude: 51.059,
    zoomAlt: 8000,
    country: "Iran",
    countryCode: "IR",
  },
  {
    id: "yongbyon",
    name: "Yongbyon Nuclear Complex",
    category: "nuclear",
    description: "North Korea's main nuclear weapons facility. 5MWe reactor, reprocessing plant, centrifuge hall.",
    significance: "Cooling water discharge and steam plumes visible on satellite imagery indicate reactor operations.",
    latitude: 39.796,
    longitude: 125.755,
    zoomAlt: 8000,
    country: "North Korea",
    countryCode: "KP",
  },
  {
    id: "dimona",
    name: "Negev Nuclear Research Center",
    category: "nuclear",
    description: "Israel's nuclear weapons production facility. Heavy water reactor and reprocessing plant.",
    significance: "Construction activity and cooling tower changes monitored for capacity expansion indicators.",
    latitude: 31.001,
    longitude: 35.145,
    zoomAlt: 8000,
    country: "Israel",
    countryCode: "IL",
  },
  {
    id: "zaporizhzhia",
    name: "Zaporizhzhia Nuclear Power Plant",
    category: "nuclear",
    description: "Europe's largest nuclear plant, occupied since March 2022. Six VVER-1000 reactors.",
    significance: "IAEA monitoring active — satellite imagery tracks military positions around reactor buildings.",
    latitude: 47.507,
    longitude: 34.586,
    zoomAlt: 8000,
    country: "Ukraine",
    countryCode: "UA",
  },

  // ── Military Installations ──────────────────────────
  {
    id: "yulin",
    name: "Yulin Naval Base",
    category: "military",
    description: "PLAN submarine base on Hainan Island. Underground pens for nuclear-armed SSBNs.",
    significance: "Submarine deployment patterns tracked via satellite — pen openings and surface vessel activity.",
    latitude: 18.226,
    longitude: 109.534,
    zoomAlt: 8000,
    country: "China",
    countryCode: "CN",
  },
  {
    id: "sevastopol",
    name: "Sevastopol Naval Base",
    category: "military",
    description: "Russia's Black Sea Fleet headquarters. Occupied Crimea since 2014.",
    significance: "Fleet readiness assessed via vessel counts, dry dock activity, and damage from Ukrainian strikes.",
    latitude: 44.618,
    longitude: 33.523,
    zoomAlt: 10000,
    country: "Russia/Crimea",
    countryCode: "RU",
  },
  {
    id: "kaliningrad",
    name: "Kaliningrad Military District",
    category: "military",
    description: "Russian Baltic exclave. Iskander missiles, S-400, Baltic Fleet HQ.",
    significance: "NATO monitoring — troop/equipment buildup visible via motor pool and rail yard imagery.",
    latitude: 54.710,
    longitude: 20.510,
    zoomAlt: 20000,
    country: "Russia",
    countryCode: "RU",
  },
  {
    id: "tartus",
    name: "Tartus Naval Facility",
    category: "military",
    description: "Russia's only Mediterranean naval base. Material-technical support point.",
    significance: "Russian naval power projection — vessel rotation and logistics activity monitored.",
    latitude: 34.889,
    longitude: 35.873,
    zoomAlt: 8000,
    country: "Syria",
    countryCode: "SY",
  },
  {
    id: "diego-garcia",
    name: "Diego Garcia",
    category: "military",
    description: "US/UK joint military base in the Indian Ocean. B-2 bomber capable runway.",
    significance: "Strategic power projection hub — bomber and naval activity indicates regional readiness.",
    latitude: -7.316,
    longitude: 72.410,
    zoomAlt: 15000,
    country: "British Indian Ocean Territory",
    countryCode: "GB",
  },
  {
    id: "camp-lemonnier",
    name: "Camp Lemonnier",
    category: "military",
    description: "US military base in Djibouti. AFRICOM forward operating base, drone operations hub.",
    significance: "Counter-terrorism operations base — aircraft parking and expansion visible on imagery.",
    latitude: 11.547,
    longitude: 43.156,
    zoomAlt: 8000,
    country: "Djibouti",
    countryCode: "DJ",
  },

  // ── Conflict Zones ──────────────────────────────────
  {
    id: "gaza",
    name: "Gaza Strip",
    category: "conflict",
    description: "Active conflict zone. Dense urban area under sustained military operations.",
    significance: "Building damage assessment, displacement patterns, and infrastructure destruction tracked daily.",
    latitude: 31.354,
    longitude: 34.308,
    zoomAlt: 25000,
    country: "Palestine",
    countryCode: "PS",
  },
  {
    id: "kherson",
    name: "Kherson Front Line",
    category: "conflict",
    description: "Dnipro River front line. Active artillery exchanges and crossing attempts.",
    significance: "Fortification construction, pontoon bridges, and crater analysis visible on high-res imagery.",
    latitude: 46.636,
    longitude: 32.617,
    zoomAlt: 20000,
    country: "Ukraine",
    countryCode: "UA",
  },
  {
    id: "khartoum",
    name: "Khartoum",
    category: "conflict",
    description: "Sudan civil war — RSF vs SAF. Heavy urban combat around government district.",
    significance: "Infrastructure damage, military vehicle positions, and displacement corridors monitored.",
    latitude: 15.588,
    longitude: 32.534,
    zoomAlt: 25000,
    country: "Sudan",
    countryCode: "SD",
  },

  // ── Strategic Infrastructure ────────────────────────
  {
    id: "hormuz",
    name: "Strait of Hormuz",
    category: "infrastructure",
    description: "World's most important oil chokepoint. 21% of global petroleum passes through daily.",
    significance: "Vessel tracking, naval patrol patterns, and tanker interdiction risk assessment.",
    latitude: 26.570,
    longitude: 56.250,
    zoomAlt: 80000,
    country: "International Waters",
    countryCode: "OM",
  },
  {
    id: "suez",
    name: "Suez Canal",
    category: "infrastructure",
    description: "Critical waterway connecting Mediterranean and Red Sea. 12% of world trade.",
    significance: "Vessel queue lengths, blockage risk, and Houthi threat diversion impact monitored.",
    latitude: 30.586,
    longitude: 32.270,
    zoomAlt: 40000,
    country: "Egypt",
    countryCode: "EG",
  },
  {
    id: "bab-el-mandeb",
    name: "Bab el-Mandeb Strait",
    category: "infrastructure",
    description: "Red Sea chokepoint between Yemen and Djibouti. Under Houthi missile/drone threat.",
    significance: "Commercial rerouting around Africa — shipping pattern changes visible in AIS data.",
    latitude: 12.583,
    longitude: 43.333,
    zoomAlt: 50000,
    country: "International Waters",
    countryCode: "YE",
  },
  {
    id: "ras-tanura",
    name: "Ras Tanura Oil Terminal",
    category: "infrastructure",
    description: "Saudi Aramco's largest oil export terminal. 6.5 million bbl/day capacity.",
    significance: "Tanker loading activity, storage tank levels (shadow analysis), and security posture.",
    latitude: 26.644,
    longitude: 50.162,
    zoomAlt: 10000,
    country: "Saudi Arabia",
    countryCode: "SA",
  },
  {
    id: "tsmc",
    name: "TSMC Hsinchu Fabs",
    category: "infrastructure",
    description: "World's most advanced semiconductor foundry. Produces >90% of leading-edge chips.",
    significance: "Global supply chain single point of failure — facility expansion and activity tracked.",
    latitude: 24.774,
    longitude: 120.998,
    zoomAlt: 8000,
    country: "Taiwan",
    countryCode: "TW",
  },
  {
    id: "panama-canal",
    name: "Panama Canal",
    category: "infrastructure",
    description: "Connects Atlantic and Pacific. Drought restrictions reducing transit capacity.",
    significance: "Water levels, vessel queue length, and new lock operations monitored.",
    latitude: 9.080,
    longitude: -79.680,
    zoomAlt: 30000,
    country: "Panama",
    countryCode: "PA",
  },

  // ── Disputed Territories ────────────────────────────
  {
    id: "fiery-cross",
    name: "Fiery Cross Reef",
    category: "disputed",
    description: "Chinese artificial island in the Spratly Islands. 3km runway, hangars, radar, CIWS.",
    significance: "Militarization tracking — new construction, aircraft deployments, and radar installations.",
    latitude: 9.550,
    longitude: 112.890,
    zoomAlt: 10000,
    country: "Disputed (SCS)",
    countryCode: "CN",
  },
  {
    id: "mischief-reef",
    name: "Mischief Reef",
    category: "disputed",
    description: "Chinese artificial island. Runway, underground storage, point defense systems.",
    significance: "One of three SCS 'Big Three' — military capability expansion tracked quarterly.",
    latitude: 9.904,
    longitude: 115.537,
    zoomAlt: 10000,
    country: "Disputed (SCS)",
    countryCode: "CN",
  },
  {
    id: "taiwan-strait",
    name: "Taiwan Strait",
    category: "disputed",
    description: "130km wide strait separating mainland China and Taiwan. Frequent PLA exercises.",
    significance: "PLA staging areas, amphibious vessel movements, and air defense deployments monitored.",
    latitude: 24.500,
    longitude: 119.000,
    zoomAlt: 200000,
    country: "International Waters",
    countryCode: "TW",
  },
  {
    id: "gwadar",
    name: "Gwadar Port",
    category: "disputed",
    description: "Chinese-built deep-water port in Pakistan. Part of CPEC / Belt and Road Initiative.",
    significance: "Potential dual-use naval base — construction progress and vessel visits tracked.",
    latitude: 25.126,
    longitude: 62.325,
    zoomAlt: 10000,
    country: "Pakistan",
    countryCode: "PK",
  },
];

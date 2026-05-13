# OODA — Open-Source Intelligence Interface

A real-time geospatial intelligence platform inspired by Bilawal Sidhu's WorldView "God's Eye" project. Built around the OODA loop (Observe, Orient, Decide, Act) for continuous situational awareness.

## Architecture

```
OODA Loop
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   OBSERVE ──► ORIENT ──► DECIDE ──► ACT                │
│      │           │          │         │                 │
│   Ingest      Fuse &     AI Agent   Alerts &           │
│   Live Data   Correlate  Analysis   Visualize          │
│      │           │          │         │                 │
│      └───────────┴──────────┴─────────┘                │
│                  (feedback loop)                        │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
OODA/
├── observe/          # OBSERVE — Data ingestion layer
│   ├── feeds/        # Live data feed connectors (AIS, ADS-B, satellites, CCTV)
│   ├── collectors/   # Scheduled data collection & caching
│   └── parsers/      # Raw data normalization & parsing
│
├── orient/           # ORIENT — Data fusion & context
│   ├── fusion/       # Multi-source data correlation
│   ├── analysis/     # Pattern detection (e.g., AIS dark ships, GPS jamming)
│   └── context/      # Geopolitical context & enrichment
│
├── decide/           # DECIDE — AI-powered decision support
│   ├── agents/       # AI agent swarm orchestration
│   ├── models/       # ML models for anomaly detection & prediction
│   └── rules/        # Rule-based alert triggers
│
├── act/              # ACT — Output & response
│   ├── alerts/       # Notification & alerting system
│   ├── visualizations/ # 3D/4D globe rendering (CesiumJS)
│   └── responses/    # Automated response playbooks
│
├── shared/           # Shared utilities
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Common utilities
│   └── config/       # Configuration & environment
│
└── docs/             # Documentation & research
```

## Reference: Bilawal Sidhu's WorldView Stack

| Layer        | Technology                                      |
|-------------|--------------------------------------------------|
| 3D Globe     | CesiumJS + Google Photorealistic 3D Tiles        |
| Frontend     | Next.js + React                                  |
| Air Traffic  | OpenSky Network, ADS-B Exchange                  |
| Maritime     | AIS vessel tracking                              |
| Satellites   | CelesTrak TLE orbital data                       |
| Geospatial   | USGS feeds, open mapping APIs                    |
| AI Agents    | Multi-agent swarm (parallel subsystem builders)  |
| Surveillance | CCTV feeds draped onto 3D city models            |

## Data Sources (Open-Source)

- **Maritime**: AIS via MarineTraffic / VesselFinder APIs, UN Comtrade shipping data
- **Aviation**: OpenSky Network, ADS-B Exchange, FlightRadar24
- **Satellite**: CelesTrak (TLE orbits), Sentinel Hub (imagery), NASA Worldview
- **Geopolitical**: ACLED conflict data, GDELT events database
- **Infrastructure**: OpenStreetMap, Overpass API
- **SIGINT**: GPS jamming detection (GPSJam.org)

## Key Capabilities (Inspired by WorldView)

1. **Live vessel tracking** through chokepoints (Strait of Hormuz, Suez, Malacca)
2. **Dark ship detection** — flag vessels that disable AIS transponders
3. **4D event reconstruction** — scrub through time to replay incidents
4. **Satellite pass prediction** — know when eyes are overhead
5. **Multi-layer fusion** — overlay air, sea, land, and space data on one globe
6. **AI anomaly detection** — spot deviations from normal patterns

## Links

- [Bilawal Sidhu YouTube](https://www.youtube.com/@bilawalsidhu)
- [Map the World (Substack)](https://www.spatialintelligence.ai/)
- [WorldView God's Eye — Strait of Hormuz](https://www.youtube.com/watch?v=ccZzOGnT4Cg)
- [Ex-Google PM Builds God's Eye to Monitor Iran in 4D](https://www.youtube.com/watch?v=0p8o7AeHDzg)
- [The Intelligence Monopoly Is Over](https://www.spatialintelligence.ai/p/the-intelligence-monopoly-is-over)

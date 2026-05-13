"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

/**
 * Geographic Labels Layer
 *
 * Renders country, state/province, and major city names as Cesium entities
 * so they appear ABOVE the Google 3D Photorealistic Tiles.
 *
 * Uses NearFarScalar to show:
 * - Country names: visible from space (20M m) down to ~500km
 * - Capital/major cities: visible from ~5M m down to ~100km
 * - Regional cities: visible from ~2M m down to ~50km
 */

interface GeoLabel {
  name: string;
  lat: number;
  lon: number;
  tier: 1 | 2 | 3; // 1=country, 2=capital/major city, 3=regional city
}

// ── Tier 1: Country Names ──────────────────────────────────
const COUNTRIES: GeoLabel[] = [
  // Asia
  { name: "CHINA", lat: 35.0, lon: 103.0, tier: 1 },
  { name: "INDIA", lat: 22.0, lon: 79.0, tier: 1 },
  { name: "JAPAN", lat: 36.5, lon: 138.0, tier: 1 },
  { name: "SOUTH KOREA", lat: 36.0, lon: 127.5, tier: 1 },
  { name: "NORTH KOREA", lat: 40.0, lon: 127.0, tier: 1 },
  { name: "INDONESIA", lat: -2.5, lon: 118.0, tier: 1 },
  { name: "PHILIPPINES", lat: 12.5, lon: 122.0, tier: 1 },
  { name: "VIETNAM", lat: 16.0, lon: 107.5, tier: 1 },
  { name: "THAILAND", lat: 15.0, lon: 101.0, tier: 1 },
  { name: "MYANMAR", lat: 19.5, lon: 96.5, tier: 1 },
  { name: "MALAYSIA", lat: 4.0, lon: 109.5, tier: 1 },
  { name: "SINGAPORE", lat: 1.35, lon: 103.82, tier: 1 },
  { name: "TAIWAN", lat: 23.7, lon: 121.0, tier: 1 },
  { name: "PAKISTAN", lat: 30.0, lon: 69.0, tier: 1 },
  { name: "BANGLADESH", lat: 24.0, lon: 90.0, tier: 1 },
  { name: "SRI LANKA", lat: 7.8, lon: 80.7, tier: 1 },
  { name: "CAMBODIA", lat: 12.5, lon: 105.0, tier: 1 },
  { name: "NEPAL", lat: 28.2, lon: 84.2, tier: 1 },
  { name: "MONGOLIA", lat: 47.0, lon: 104.0, tier: 1 },
  { name: "LAOS", lat: 18.0, lon: 105.0, tier: 1 },

  // Middle East
  { name: "IRAN", lat: 32.5, lon: 54.0, tier: 1 },
  { name: "IRAQ", lat: 33.0, lon: 44.0, tier: 1 },
  { name: "SAUDI ARABIA", lat: 24.0, lon: 45.0, tier: 1 },
  { name: "UAE", lat: 24.0, lon: 54.0, tier: 1 },
  { name: "TURKEY", lat: 39.0, lon: 35.0, tier: 1 },
  { name: "SYRIA", lat: 35.0, lon: 38.5, tier: 1 },
  { name: "ISRAEL", lat: 31.5, lon: 35.0, tier: 1 },
  { name: "JORDAN", lat: 31.2, lon: 36.8, tier: 1 },
  { name: "YEMEN", lat: 15.5, lon: 47.5, tier: 1 },
  { name: "OMAN", lat: 21.5, lon: 57.0, tier: 1 },
  { name: "KUWAIT", lat: 29.3, lon: 47.6, tier: 1 },
  { name: "QATAR", lat: 25.3, lon: 51.2, tier: 1 },
  { name: "LEBANON", lat: 33.9, lon: 35.9, tier: 1 },
  { name: "BAHRAIN", lat: 26.0, lon: 50.5, tier: 1 },
  { name: "AFGHANISTAN", lat: 33.9, lon: 67.7, tier: 1 },

  // Europe
  { name: "RUSSIA", lat: 62.0, lon: 94.0, tier: 1 },
  { name: "UKRAINE", lat: 49.0, lon: 32.0, tier: 1 },
  { name: "FRANCE", lat: 46.5, lon: 2.5, tier: 1 },
  { name: "GERMANY", lat: 51.2, lon: 10.4, tier: 1 },
  { name: "UNITED KINGDOM", lat: 54.0, lon: -2.5, tier: 1 },
  { name: "ITALY", lat: 42.5, lon: 12.5, tier: 1 },
  { name: "SPAIN", lat: 40.0, lon: -3.7, tier: 1 },
  { name: "POLAND", lat: 52.0, lon: 19.5, tier: 1 },
  { name: "ROMANIA", lat: 46.0, lon: 25.0, tier: 1 },
  { name: "NETHERLANDS", lat: 52.3, lon: 5.3, tier: 1 },
  { name: "GREECE", lat: 39.0, lon: 22.0, tier: 1 },
  { name: "PORTUGAL", lat: 39.5, lon: -8.0, tier: 1 },
  { name: "SWEDEN", lat: 62.0, lon: 15.0, tier: 1 },
  { name: "NORWAY", lat: 64.0, lon: 12.0, tier: 1 },
  { name: "FINLAND", lat: 64.0, lon: 26.0, tier: 1 },
  { name: "DENMARK", lat: 56.0, lon: 10.0, tier: 1 },
  { name: "SWITZERLAND", lat: 46.8, lon: 8.2, tier: 1 },
  { name: "AUSTRIA", lat: 47.5, lon: 14.5, tier: 1 },
  { name: "BELGIUM", lat: 50.8, lon: 4.4, tier: 1 },
  { name: "CZECH REPUBLIC", lat: 49.8, lon: 15.5, tier: 1 },
  { name: "HUNGARY", lat: 47.2, lon: 19.5, tier: 1 },
  { name: "IRELAND", lat: 53.4, lon: -8.2, tier: 1 },
  { name: "SERBIA", lat: 44.0, lon: 21.0, tier: 1 },
  { name: "BULGARIA", lat: 42.7, lon: 25.5, tier: 1 },
  { name: "CROATIA", lat: 45.2, lon: 15.5, tier: 1 },
  { name: "BELARUS", lat: 53.5, lon: 28.0, tier: 1 },
  { name: "ICELAND", lat: 65.0, lon: -18.5, tier: 1 },

  // Africa
  { name: "EGYPT", lat: 27.0, lon: 30.0, tier: 1 },
  { name: "SOUTH AFRICA", lat: -30.0, lon: 25.0, tier: 1 },
  { name: "NIGERIA", lat: 9.5, lon: 8.0, tier: 1 },
  { name: "KENYA", lat: 0.5, lon: 38.0, tier: 1 },
  { name: "ETHIOPIA", lat: 9.0, lon: 39.5, tier: 1 },
  { name: "MOROCCO", lat: 32.0, lon: -6.0, tier: 1 },
  { name: "ALGERIA", lat: 28.0, lon: 2.0, tier: 1 },
  { name: "LIBYA", lat: 27.0, lon: 17.0, tier: 1 },
  { name: "SUDAN", lat: 15.5, lon: 30.0, tier: 1 },
  { name: "DR CONGO", lat: -3.0, lon: 23.0, tier: 1 },
  { name: "TANZANIA", lat: -6.5, lon: 35.0, tier: 1 },
  { name: "ANGOLA", lat: -12.5, lon: 18.5, tier: 1 },
  { name: "MOZAMBIQUE", lat: -18.0, lon: 35.5, tier: 1 },
  { name: "MADAGASCAR", lat: -19.0, lon: 47.0, tier: 1 },
  { name: "GHANA", lat: 7.9, lon: -1.0, tier: 1 },
  { name: "SOMALIA", lat: 5.0, lon: 46.0, tier: 1 },
  { name: "TUNISIA", lat: 34.0, lon: 9.0, tier: 1 },
  { name: "DJIBOUTI", lat: 11.5, lon: 43.0, tier: 1 },
  { name: "ERITREA", lat: 15.3, lon: 39.0, tier: 1 },

  // Americas
  { name: "UNITED STATES", lat: 39.5, lon: -98.5, tier: 1 },
  { name: "CANADA", lat: 56.0, lon: -96.0, tier: 1 },
  { name: "MEXICO", lat: 23.5, lon: -102.5, tier: 1 },
  { name: "BRAZIL", lat: -10.0, lon: -52.0, tier: 1 },
  { name: "ARGENTINA", lat: -34.0, lon: -64.0, tier: 1 },
  { name: "COLOMBIA", lat: 4.5, lon: -73.0, tier: 1 },
  { name: "PERU", lat: -10.0, lon: -76.0, tier: 1 },
  { name: "VENEZUELA", lat: 7.5, lon: -66.5, tier: 1 },
  { name: "CHILE", lat: -33.5, lon: -70.5, tier: 1 },
  { name: "CUBA", lat: 22.0, lon: -79.5, tier: 1 },
  { name: "PANAMA", lat: 8.5, lon: -80.0, tier: 1 },
  { name: "ECUADOR", lat: -1.5, lon: -78.5, tier: 1 },
  { name: "GUATEMALA", lat: 15.5, lon: -90.3, tier: 1 },

  // Oceania
  { name: "AUSTRALIA", lat: -25.0, lon: 134.0, tier: 1 },
  { name: "NEW ZEALAND", lat: -42.0, lon: 172.0, tier: 1 },
  { name: "PAPUA NEW GUINEA", lat: -6.5, lon: 147.0, tier: 1 },

  // Central Asia
  { name: "KAZAKHSTAN", lat: 48.0, lon: 67.0, tier: 1 },
  { name: "UZBEKISTAN", lat: 41.3, lon: 64.6, tier: 1 },
  { name: "TURKMENISTAN", lat: 39.0, lon: 59.5, tier: 1 },
];

// ── Tier 2: Capitals & Major Cities ────────────────────────
const MAJOR_CITIES: GeoLabel[] = [
  // Asia
  { name: "Beijing", lat: 39.9, lon: 116.4, tier: 2 },
  { name: "Shanghai", lat: 31.2, lon: 121.5, tier: 2 },
  { name: "Tokyo", lat: 35.68, lon: 139.77, tier: 2 },
  { name: "Seoul", lat: 37.56, lon: 127.0, tier: 2 },
  { name: "New Delhi", lat: 28.61, lon: 77.23, tier: 2 },
  { name: "Mumbai", lat: 19.08, lon: 72.88, tier: 2 },
  { name: "Jakarta", lat: -6.2, lon: 106.85, tier: 2 },
  { name: "Bangkok", lat: 13.75, lon: 100.5, tier: 2 },
  { name: "Hanoi", lat: 21.03, lon: 105.85, tier: 2 },
  { name: "Kuala Lumpur", lat: 3.14, lon: 101.69, tier: 2 },
  { name: "Manila", lat: 14.6, lon: 121.0, tier: 2 },
  { name: "Taipei", lat: 25.03, lon: 121.57, tier: 2 },
  { name: "Islamabad", lat: 33.7, lon: 73.04, tier: 2 },
  { name: "Dhaka", lat: 23.8, lon: 90.4, tier: 2 },
  { name: "Hong Kong", lat: 22.3, lon: 114.2, tier: 2 },
  { name: "Yangon", lat: 16.87, lon: 96.2, tier: 2 },
  { name: "Karachi", lat: 24.86, lon: 67.0, tier: 2 },

  // Middle East
  { name: "Tehran", lat: 35.69, lon: 51.39, tier: 2 },
  { name: "Baghdad", lat: 33.31, lon: 44.37, tier: 2 },
  { name: "Riyadh", lat: 24.71, lon: 46.68, tier: 2 },
  { name: "Dubai", lat: 25.2, lon: 55.27, tier: 2 },
  { name: "Abu Dhabi", lat: 24.45, lon: 54.65, tier: 2 },
  { name: "Ankara", lat: 39.93, lon: 32.87, tier: 2 },
  { name: "Istanbul", lat: 41.01, lon: 28.98, tier: 2 },
  { name: "Tel Aviv", lat: 32.08, lon: 34.78, tier: 2 },
  { name: "Jerusalem", lat: 31.77, lon: 35.23, tier: 2 },
  { name: "Damascus", lat: 33.51, lon: 36.29, tier: 2 },
  { name: "Doha", lat: 25.29, lon: 51.53, tier: 2 },
  { name: "Muscat", lat: 23.59, lon: 58.54, tier: 2 },
  { name: "Kabul", lat: 34.52, lon: 69.17, tier: 2 },

  // Europe
  { name: "Moscow", lat: 55.76, lon: 37.62, tier: 2 },
  { name: "London", lat: 51.51, lon: -0.13, tier: 2 },
  { name: "Paris", lat: 48.86, lon: 2.35, tier: 2 },
  { name: "Berlin", lat: 52.52, lon: 13.4, tier: 2 },
  { name: "Rome", lat: 41.9, lon: 12.5, tier: 2 },
  { name: "Madrid", lat: 40.42, lon: -3.7, tier: 2 },
  { name: "Kyiv", lat: 50.45, lon: 30.52, tier: 2 },
  { name: "Warsaw", lat: 52.23, lon: 21.01, tier: 2 },
  { name: "Amsterdam", lat: 52.37, lon: 4.9, tier: 2 },
  { name: "Athens", lat: 37.98, lon: 23.73, tier: 2 },
  { name: "Stockholm", lat: 59.33, lon: 18.07, tier: 2 },
  { name: "Oslo", lat: 59.91, lon: 10.75, tier: 2 },
  { name: "Helsinki", lat: 60.17, lon: 24.94, tier: 2 },
  { name: "Brussels", lat: 50.85, lon: 4.35, tier: 2 },
  { name: "Vienna", lat: 48.21, lon: 16.37, tier: 2 },
  { name: "Lisbon", lat: 38.72, lon: -9.14, tier: 2 },
  { name: "Bucharest", lat: 44.43, lon: 26.1, tier: 2 },
  { name: "Prague", lat: 50.08, lon: 14.43, tier: 2 },
  { name: "Budapest", lat: 47.5, lon: 19.04, tier: 2 },
  { name: "Dublin", lat: 53.35, lon: -6.26, tier: 2 },
  { name: "St Petersburg", lat: 59.93, lon: 30.32, tier: 2 },

  // Africa
  { name: "Cairo", lat: 30.04, lon: 31.24, tier: 2 },
  { name: "Lagos", lat: 6.52, lon: 3.38, tier: 2 },
  { name: "Nairobi", lat: -1.29, lon: 36.82, tier: 2 },
  { name: "Johannesburg", lat: -26.2, lon: 28.04, tier: 2 },
  { name: "Cape Town", lat: -33.93, lon: 18.42, tier: 2 },
  { name: "Addis Ababa", lat: 9.02, lon: 38.75, tier: 2 },
  { name: "Casablanca", lat: 33.57, lon: -7.59, tier: 2 },
  { name: "Algiers", lat: 36.75, lon: 3.04, tier: 2 },

  // Americas
  { name: "Washington DC", lat: 38.9, lon: -77.04, tier: 2 },
  { name: "New York", lat: 40.71, lon: -74.01, tier: 2 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24, tier: 2 },
  { name: "Chicago", lat: 41.88, lon: -87.63, tier: 2 },
  { name: "Houston", lat: 29.76, lon: -95.37, tier: 2 },
  { name: "San Francisco", lat: 37.77, lon: -122.42, tier: 2 },
  { name: "Mexico City", lat: 19.43, lon: -99.13, tier: 2 },
  { name: "Ottawa", lat: 45.42, lon: -75.69, tier: 2 },
  { name: "Toronto", lat: 43.65, lon: -79.38, tier: 2 },
  { name: "Brasilia", lat: -15.79, lon: -47.88, tier: 2 },
  { name: "Sao Paulo", lat: -23.55, lon: -46.63, tier: 2 },
  { name: "Buenos Aires", lat: -34.6, lon: -58.38, tier: 2 },
  { name: "Bogota", lat: 4.71, lon: -74.07, tier: 2 },
  { name: "Lima", lat: -12.05, lon: -77.04, tier: 2 },
  { name: "Santiago", lat: -33.45, lon: -70.67, tier: 2 },
  { name: "Havana", lat: 23.11, lon: -82.37, tier: 2 },
  { name: "Panama City", lat: 8.98, lon: -79.52, tier: 2 },

  // Oceania
  { name: "Sydney", lat: -33.87, lon: 151.21, tier: 2 },
  { name: "Melbourne", lat: -37.81, lon: 144.96, tier: 2 },
  { name: "Canberra", lat: -35.28, lon: 149.13, tier: 2 },
  { name: "Auckland", lat: -36.85, lon: 174.76, tier: 2 },
  { name: "Wellington", lat: -41.29, lon: 174.78, tier: 2 },
];

// ── Tier 3: Regional / Secondary Cities ────────────────────
const REGIONAL_CITIES: GeoLabel[] = [
  // China
  { name: "Guangzhou", lat: 23.13, lon: 113.26, tier: 3 },
  { name: "Shenzhen", lat: 22.54, lon: 114.06, tier: 3 },
  { name: "Chengdu", lat: 30.57, lon: 104.07, tier: 3 },
  { name: "Wuhan", lat: 30.59, lon: 114.3, tier: 3 },
  { name: "Tianjin", lat: 39.14, lon: 117.18, tier: 3 },
  { name: "Chongqing", lat: 29.56, lon: 106.55, tier: 3 },
  { name: "Nanjing", lat: 32.06, lon: 118.8, tier: 3 },
  { name: "Hangzhou", lat: 30.27, lon: 120.15, tier: 3 },
  { name: "Xiamen", lat: 24.48, lon: 118.09, tier: 3 },

  // India
  { name: "Chennai", lat: 13.08, lon: 80.27, tier: 3 },
  { name: "Kolkata", lat: 22.57, lon: 88.36, tier: 3 },
  { name: "Bangalore", lat: 12.97, lon: 77.59, tier: 3 },
  { name: "Hyderabad", lat: 17.38, lon: 78.49, tier: 3 },

  // Japan
  { name: "Osaka", lat: 34.69, lon: 135.5, tier: 3 },
  { name: "Yokohama", lat: 35.44, lon: 139.64, tier: 3 },
  { name: "Nagoya", lat: 35.18, lon: 136.91, tier: 3 },
  { name: "Fukuoka", lat: 33.59, lon: 130.4, tier: 3 },

  // South Korea
  { name: "Busan", lat: 35.18, lon: 129.08, tier: 3 },
  { name: "Incheon", lat: 37.46, lon: 126.71, tier: 3 },

  // Southeast Asia
  { name: "Ho Chi Minh", lat: 10.82, lon: 106.63, tier: 3 },
  { name: "Surabaya", lat: -7.25, lon: 112.75, tier: 3 },
  { name: "Phnom Penh", lat: 11.56, lon: 104.92, tier: 3 },

  // Middle East
  { name: "Jeddah", lat: 21.49, lon: 39.19, tier: 3 },
  { name: "Basra", lat: 30.51, lon: 47.81, tier: 3 },
  { name: "Isfahan", lat: 32.65, lon: 51.68, tier: 3 },
  { name: "Izmir", lat: 38.42, lon: 27.14, tier: 3 },
  { name: "Haifa", lat: 32.79, lon: 34.99, tier: 3 },

  // Europe
  { name: "Barcelona", lat: 41.39, lon: 2.17, tier: 3 },
  { name: "Milan", lat: 45.46, lon: 9.19, tier: 3 },
  { name: "Munich", lat: 48.14, lon: 11.58, tier: 3 },
  { name: "Hamburg", lat: 53.55, lon: 9.99, tier: 3 },
  { name: "Rotterdam", lat: 51.92, lon: 4.48, tier: 3 },
  { name: "Marseille", lat: 43.3, lon: 5.37, tier: 3 },
  { name: "Edinburgh", lat: 55.95, lon: -3.19, tier: 3 },
  { name: "Manchester", lat: 53.48, lon: -2.24, tier: 3 },
  { name: "Gdansk", lat: 54.35, lon: 18.65, tier: 3 },
  { name: "Odesa", lat: 46.48, lon: 30.73, tier: 3 },
  { name: "Sevastopol", lat: 44.62, lon: 33.52, tier: 3 },
  { name: "Novosibirsk", lat: 55.03, lon: 82.92, tier: 3 },
  { name: "Vladivostok", lat: 43.12, lon: 131.89, tier: 3 },
  { name: "Murmansk", lat: 68.97, lon: 33.07, tier: 3 },

  // Africa
  { name: "Durban", lat: -29.86, lon: 31.02, tier: 3 },
  { name: "Mombasa", lat: -4.04, lon: 39.67, tier: 3 },
  { name: "Dar es Salaam", lat: -6.79, lon: 39.28, tier: 3 },
  { name: "Alexandria", lat: 31.2, lon: 29.92, tier: 3 },
  { name: "Tripoli", lat: 32.9, lon: 13.18, tier: 3 },

  // Americas
  { name: "Miami", lat: 25.76, lon: -80.19, tier: 3 },
  { name: "Seattle", lat: 47.61, lon: -122.33, tier: 3 },
  { name: "Boston", lat: 42.36, lon: -71.06, tier: 3 },
  { name: "Dallas", lat: 32.78, lon: -96.8, tier: 3 },
  { name: "Atlanta", lat: 33.75, lon: -84.39, tier: 3 },
  { name: "Denver", lat: 39.74, lon: -104.99, tier: 3 },
  { name: "Vancouver", lat: 49.28, lon: -123.12, tier: 3 },
  { name: "Montreal", lat: 45.5, lon: -73.57, tier: 3 },
  { name: "Honolulu", lat: 21.31, lon: -157.86, tier: 3 },
  { name: "Anchorage", lat: 61.22, lon: -149.9, tier: 3 },
  { name: "Rio de Janeiro", lat: -22.91, lon: -43.17, tier: 3 },
  { name: "Caracas", lat: 10.49, lon: -66.88, tier: 3 },
  { name: "Medellin", lat: 6.25, lon: -75.56, tier: 3 },

  // Oceania
  { name: "Perth", lat: -31.95, lon: 115.86, tier: 3 },
  { name: "Brisbane", lat: -27.47, lon: 153.03, tier: 3 },
  { name: "Darwin", lat: -12.46, lon: 130.84, tier: 3 },

  // Seas & Oceans (for orientation)
  { name: "PACIFIC OCEAN", lat: 0.0, lon: -160.0, tier: 1 },
  { name: "ATLANTIC OCEAN", lat: 15.0, lon: -35.0, tier: 1 },
  { name: "INDIAN OCEAN", lat: -15.0, lon: 75.0, tier: 1 },
  { name: "ARCTIC OCEAN", lat: 80.0, lon: 0.0, tier: 1 },
  { name: "SOUTHERN OCEAN", lat: -65.0, lon: 0.0, tier: 1 },
  { name: "South China Sea", lat: 12.0, lon: 114.0, tier: 2 },
  { name: "Mediterranean Sea", lat: 35.0, lon: 18.0, tier: 2 },
  { name: "Arabian Sea", lat: 15.0, lon: 65.0, tier: 2 },
  { name: "Bay of Bengal", lat: 14.0, lon: 87.0, tier: 2 },
  { name: "Gulf of Mexico", lat: 25.0, lon: -90.0, tier: 2 },
  { name: "Caribbean Sea", lat: 15.0, lon: -73.0, tier: 2 },
  { name: "Red Sea", lat: 20.0, lon: 38.5, tier: 2 },
  { name: "Persian Gulf", lat: 26.5, lon: 51.5, tier: 2 },
  { name: "Black Sea", lat: 43.5, lon: 34.0, tier: 2 },
  { name: "North Sea", lat: 57.0, lon: 3.0, tier: 2 },
  { name: "Sea of Japan", lat: 40.0, lon: 135.0, tier: 2 },
  { name: "Strait of Malacca", lat: 3.5, lon: 100.0, tier: 3 },
  { name: "Strait of Hormuz", lat: 26.5, lon: 56.5, tier: 3 },
  { name: "Suez Canal", lat: 30.5, lon: 32.3, tier: 3 },
  { name: "Bab el-Mandeb", lat: 12.6, lon: 43.3, tier: 3 },
  { name: "Taiwan Strait", lat: 24.0, lon: 119.0, tier: 3 },
];

const ALL_LABELS = [...COUNTRIES, ...MAJOR_CITIES, ...REGIONAL_CITIES];

// ── Tier-based visibility distances ────────────────────────
// Tier 1 (countries/oceans): visible from 20,000km to 800km
// Tier 2 (capitals/major cities): visible from 5,000km to 100km
// Tier 3 (regional cities): visible from 2,000km to 50km

function getTierScale(tier: 1 | 2 | 3) {
  switch (tier) {
    case 1:
      return {
        scale: new Cesium.NearFarScalar(800_000, 0.7, 20_000_000, 0.4),
        translucency: new Cesium.NearFarScalar(500_000, 0.0, 1_000_000, 1.0),
        distanceDisplay: new Cesium.DistanceDisplayCondition(0, 25_000_000),
        fontSize: 13,
        color: Cesium.Color.WHITE.withAlpha(0.85),
      };
    case 2:
      return {
        scale: new Cesium.NearFarScalar(200_000, 0.65, 6_000_000, 0.35),
        translucency: new Cesium.NearFarScalar(100_000, 0.0, 300_000, 1.0),
        distanceDisplay: new Cesium.DistanceDisplayCondition(0, 8_000_000),
        fontSize: 11,
        color: Cesium.Color.fromCssColorString("#cccccc").withAlpha(0.8),
      };
    case 3:
      return {
        scale: new Cesium.NearFarScalar(80_000, 0.6, 3_000_000, 0.3),
        translucency: new Cesium.NearFarScalar(40_000, 0.0, 100_000, 1.0),
        distanceDisplay: new Cesium.DistanceDisplayCondition(0, 3_500_000),
        fontSize: 10,
        color: Cesium.Color.fromCssColorString("#999999").withAlpha(0.7),
      };
  }
}

export function GeoLabelsLayer({ viewer }: { viewer: Cesium.Viewer }) {
  const dsRef = useRef<Cesium.CustomDataSource | null>(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const ds = new Cesium.CustomDataSource("geo-labels");
    viewer.dataSources.add(ds);
    dsRef.current = ds;

    for (const label of ALL_LABELS) {
      const tier = getTierScale(label.tier);

      ds.entities.add({
        id: `geo-${label.tier}-${label.name}`,
        position: Cesium.Cartesian3.fromDegrees(label.lon, label.lat),
        label: {
          text: label.name,
          font: `bold ${tier.fontSize}px monospace`,
          fillColor: tier.color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          scaleByDistance: tier.scale,
          translucencyByDistance: tier.translucency,
          distanceDisplayCondition: tier.distanceDisplay,
        },
      });
    }

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.dataSources.remove(ds, true);
      }
    };
  }, [viewer]);

  return null;
}

import type { GeoNode } from "./types";

/** Anchor hub — Acme Pay's operations sit in Mumbai. Globe centers here. */
export const HUB: GeoNode = { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.877, weight: 1 };

/** Weighted Indian city pool — drives user geography, the globe and the heatmap. */
export const CITIES: GeoNode[] = [
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.877, weight: 18 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.972, lng: 77.595, weight: 16 },
  { name: "Delhi NCR", state: "Delhi", lat: 28.613, lng: 77.209, weight: 15 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.487, weight: 11 },
  { name: "Pune", state: "Maharashtra", lat: 18.52, lng: 73.857, weight: 9 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.083, lng: 80.27, weight: 8 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.022, lng: 72.571, weight: 6 },
  { name: "Kolkata", state: "West Bengal", lat: 22.573, lng: 88.364, weight: 6 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.912, lng: 75.787, weight: 4 },
  { name: "Surat", state: "Gujarat", lat: 21.17, lng: 72.831, weight: 3 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.847, lng: 80.946, weight: 3 },
  { name: "Kochi", state: "Kerala", lat: 9.931, lng: 76.267, weight: 3 },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.72, lng: 75.857, weight: 2 },
  { name: "Chandigarh", state: "Chandigarh", lat: 30.733, lng: 76.779, weight: 2 },
  { name: "Coimbatore", state: "Tamil Nadu", lat: 11.017, lng: 76.956, weight: 2 },
  { name: "Nagpur", state: "Maharashtra", lat: 21.146, lng: 79.088, weight: 2 },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.687, lng: 83.219, weight: 2 },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.26, lng: 77.413, weight: 1 },
  { name: "Guwahati", state: "Assam", lat: 26.144, lng: 91.736, weight: 1 },
];

/** Cross-border corridors — a few inbound remittance sources for the globe. */
export const INTL_NODES: GeoNode[] = [
  { name: "Singapore", state: "SG", lat: 1.352, lng: 103.82, weight: 4, intl: true },
  { name: "Dubai", state: "AE", lat: 25.205, lng: 55.271, weight: 4, intl: true },
  { name: "London", state: "UK", lat: 51.507, lng: -0.128, weight: 2, intl: true },
  { name: "San Francisco", state: "US", lat: 37.775, lng: -122.419, weight: 2, intl: true },
];

const totalWeight = CITIES.reduce((s, c) => s + c.weight, 0);

/** Deterministic weighted city pick given a 0..1 roll. */
export function pickCity(roll: number): GeoNode {
  let acc = 0;
  const target = roll * totalWeight;
  for (const c of CITIES) {
    acc += c.weight;
    if (target <= acc) return c;
  }
  return CITIES[0];
}
